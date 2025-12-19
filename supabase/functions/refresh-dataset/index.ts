import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generic user-facing error messages (hide internal details)
const USER_ERROR_MESSAGES = {
  auth_failed: "Falha na autenticação. Verifique suas credenciais do Power BI.",
  resource_not_found: "Recurso não encontrado. Verifique as configurações do dashboard.",
  permission_denied: "Você não tem permissão para atualizar este dashboard.",
  refresh_in_progress: "Atualização já em andamento ou limite atingido. Tente novamente mais tarde.",
  service_error: "Erro ao processar solicitação. Tente novamente mais tarde.",
  credentials_missing: "Credenciais não configuradas para este dashboard.",
};

// Categorize errors for safe user messages
function categorizeError(error: Error | string): keyof typeof USER_ERROR_MESSAGES {
  const message = typeof error === 'string' ? error : error.message;
  const lowerMsg = message.toLowerCase();
  
  if (lowerMsg.includes('authentication') || lowerMsg.includes('token') || lowerMsg.includes('azure')) {
    return 'auth_failed';
  }
  if (lowerMsg.includes('not found') || lowerMsg.includes('404')) {
    return 'resource_not_found';
  }
  if (lowerMsg.includes('permission') || lowerMsg.includes('denied') || lowerMsg.includes('403') || lowerMsg.includes('permissão')) {
    return 'permission_denied';
  }
  if (lowerMsg.includes('400') || lowerMsg.includes('in progress') || lowerMsg.includes('andamento') || lowerMsg.includes('limite')) {
    return 'refresh_in_progress';
  }
  if (lowerMsg.includes('credencial') || lowerMsg.includes('credential')) {
    return 'credentials_missing';
  }
  return 'service_error';
}

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
    console.error("[AUDIT] Decryption failed - returning as-is for backward compatibility");
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
    console.error("[AUDIT] Azure AD token error:", errorText);
    throw new Error(USER_ERROR_MESSAGES.auth_failed);
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
    console.error("[AUDIT] Report fetch error:", errorText);
    throw new Error(USER_ERROR_MESSAGES.resource_not_found);
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
    console.error("[AUDIT] Dataset refresh error:", errorText);
    
    // Parse common errors
    if (response.status === 400) {
      throw new Error(USER_ERROR_MESSAGES.refresh_in_progress);
    }
    if (response.status === 403) {
      throw new Error(USER_ERROR_MESSAGES.permission_denied);
    }
    
    throw new Error(USER_ERROR_MESSAGES.service_error);
  }

  console.log("Dataset refresh triggered successfully");
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let historyId: string | null = null;

  try {
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

    console.log("[AUDIT] Processing refresh request for dashboard:", dashboardId);
    console.log("[AUDIT] User ID:", user.id);

    // Check if user has refresh permission for this dashboard
    const { data: permission, error: permError } = await supabase
      .from("user_dashboard_refresh_permissions")
      .select("id")
      .eq("dashboard_id", dashboardId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (permError) {
      console.error("[AUDIT] Permission check error:", permError);
      throw new Error(USER_ERROR_MESSAGES.service_error);
    }

    if (!permission) {
      throw new Error(USER_ERROR_MESSAGES.permission_denied);
    }

    // Create history entry
    const { data: historyEntry, error: historyError } = await supabase
      .from("dashboard_refresh_history")
      .insert({
        dashboard_id: dashboardId,
        user_id: user.id,
        status: "pending",
      })
      .select("id")
      .single();

    if (historyError) {
      console.error("[AUDIT] Error creating history entry:", historyError);
    } else {
      historyId = historyEntry.id;
    }

    // Get dashboard with credential
    const { data: dashboard, error: dashboardError } = await supabase
      .from("dashboards")
      .select("workspace_id, dashboard_id, credential_id, dataset_id")
      .eq("id", dashboardId)
      .single();

    if (dashboardError || !dashboard) {
      console.error("[AUDIT] Dashboard not found:", dashboardError);
      throw new Error(USER_ERROR_MESSAGES.resource_not_found);
    }

    if (!dashboard.credential_id) {
      throw new Error(USER_ERROR_MESSAGES.credentials_missing);
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
      console.error("[AUDIT] Credential not found:", credError);
      throw new Error(USER_ERROR_MESSAGES.credentials_missing);
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

    console.log("[AUDIT] Dataset refresh completed successfully");

    // Update history entry as completed
    if (historyId) {
      await supabase
        .from("dashboard_refresh_history")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", historyId);
    }

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
    console.error("[AUDIT] Error in refresh-dataset:", error.message);

    // Update history entry as failed
    if (historyId) {
      await supabase
        .from("dashboard_refresh_history")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: "Falha na atualização",
        })
        .eq("id", historyId);
    }

    // Determine safe user-facing error message
    const errorCategory = categorizeError(error);
    const safeError = USER_ERROR_MESSAGES[errorCategory];

    return new Response(
      JSON.stringify({
        success: false,
        error: safeError,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
