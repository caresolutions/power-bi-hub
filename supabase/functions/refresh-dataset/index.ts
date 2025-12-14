import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PowerBIConfig {
  client_id: string;
  client_secret: string;
  tenant_id: string;
  username: string;
  password: string;
}

// Decrypt function for encrypted credentials
async function decryptValue(ciphertext: string, keyString: string): Promise<string> {
  if (!ciphertext) return "";
  
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(keyString.padEnd(32, '0').slice(0, 32));
    
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );
    
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error("Decryption failed - returning as-is for backward compatibility");
    return ciphertext;
  }
}

// Master User authentication using ROPC flow
async function getAzureAccessToken(config: PowerBIConfig): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${config.tenant_id}/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    grant_type: "password",
    client_id: config.client_id,
    client_secret: config.client_secret,
    scope: "https://analysis.windows.net/powerbi/api/.default",
    username: config.username,
    password: config.password,
  });

  console.log("Requesting Azure AD token for dataset refresh...");

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Azure AD token error:", errorText);
    throw new Error(`Failed to get Azure AD token: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log("Azure AD token obtained successfully");
  return data.access_token;
}

// Get dataset ID from report
async function getDatasetFromReport(
  accessToken: string,
  workspaceId: string,
  reportId: string
): Promise<string> {
  const reportUrl = `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports/${reportId}`;
  
  console.log("Fetching report to get dataset ID...");

  const response = await fetch(reportUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Report fetch error:", errorText);
    throw new Error(`Falha ao buscar relatório: ${response.status}`);
  }

  const reportData = await response.json();
  console.log("Dataset ID:", reportData.datasetId);
  return reportData.datasetId;
}

// Refresh dataset
async function refreshDataset(
  accessToken: string,
  workspaceId: string,
  datasetId: string
): Promise<void> {
  const refreshUrl = `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/datasets/${datasetId}/refreshes`;
  
  console.log("Triggering dataset refresh...");

  const response = await fetch(refreshUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      notifyOption: "NoNotification"
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Dataset refresh error:", errorText);
    
    // Parse common errors
    if (response.status === 400) {
      throw new Error("Atualização já em andamento ou limite de atualizações atingido");
    }
    if (response.status === 403) {
      throw new Error("Sem permissão para atualizar o dataset");
    }
    
    throw new Error(`Falha ao atualizar dataset: ${response.status} - ${errorText}`);
  }

  console.log("Dataset refresh triggered successfully");
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { dashboardId } = await req.json();

    if (!dashboardId) {
      throw new Error("Dashboard ID is required");
    }

    console.log("Processing refresh request for dashboard:", dashboardId);
    console.log("User ID:", user.id);

    // Check if user has refresh permission for this dashboard
    const { data: permission, error: permError } = await supabase
      .from("user_dashboard_refresh_permissions")
      .select("id")
      .eq("dashboard_id", dashboardId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (permError) {
      console.error("Permission check error:", permError);
      throw new Error("Erro ao verificar permissões");
    }

    if (!permission) {
      throw new Error("Você não tem permissão para atualizar este dashboard");
    }

    // Get dashboard with credential
    const { data: dashboard, error: dashboardError } = await supabase
      .from("dashboards")
      .select("workspace_id, dashboard_id, credential_id, dataset_id")
      .eq("id", dashboardId)
      .single();

    if (dashboardError || !dashboard) {
      console.error("Dashboard not found:", dashboardError);
      throw new Error("Dashboard não encontrado");
    }

    if (!dashboard.credential_id) {
      throw new Error("Nenhuma credencial configurada para este dashboard");
    }

    // Get and decrypt credentials
    const encryptionKey = Deno.env.get("ENCRYPTION_KEY");
    let credential: PowerBIConfig;

    const { data: credData, error: credError } = await supabase
      .from("power_bi_configs")
      .select("client_id, client_secret, tenant_id, username, password")
      .eq("id", dashboard.credential_id)
      .single();

    if (credError || !credData) {
      console.error("Credential not found:", credError);
      throw new Error("Credenciais do Power BI não encontradas");
    }

    if (encryptionKey) {
      credential = {
        client_id: credData.client_id,
        client_secret: await decryptValue(credData.client_secret, encryptionKey),
        tenant_id: credData.tenant_id,
        username: credData.username,
        password: await decryptValue(credData.password || "", encryptionKey),
      };
    } else {
      credential = credData as PowerBIConfig;
    }

    // Get Azure AD access token
    const accessToken = await getAzureAccessToken(credential);

    // Get dataset ID from report if not stored
    let datasetId = dashboard.dataset_id;
    if (!datasetId) {
      datasetId = await getDatasetFromReport(
        accessToken,
        dashboard.workspace_id,
        dashboard.dashboard_id
      );

      // Store dataset_id for future use
      await supabase
        .from("dashboards")
        .update({ dataset_id: datasetId })
        .eq("id", dashboardId);
    }

    // Trigger dataset refresh
    await refreshDataset(accessToken, dashboard.workspace_id, datasetId);

    console.log("Dataset refresh completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Atualização do dataset iniciada com sucesso",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in refresh-dataset:", error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
