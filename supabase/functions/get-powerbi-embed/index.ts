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
  permission_denied: "Sem permissão para acessar este recurso.",
  embed_error: "Erro ao gerar visualização. Verifique as permissões do workspace.",
  service_error: "Erro ao processar solicitação. Tente novamente mais tarde.",
  credentials_missing: "Credenciais não configuradas. Configure na página de Credenciais.",
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
  if (lowerMsg.includes('permission') || lowerMsg.includes('denied') || lowerMsg.includes('unauthorized') || lowerMsg.includes('403')) {
    return 'permission_denied';
  }
  if (lowerMsg.includes('embed') || lowerMsg.includes('workspace') || lowerMsg.includes('report')) {
    return 'embed_error';
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

interface EmbedTokenResponse {
  embedUrl: string;
  embedToken: string;
  expiration: string;
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
    // Return as-is if decryption fails (for backward compatibility with unencrypted data)
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

  console.log("Requesting Azure AD token using Master User auth...");

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

async function getReportEmbedToken(
  accessToken: string,
  workspaceId: string,
  reportId: string
): Promise<EmbedTokenResponse> {
  // First, get report details
  const reportUrl = `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports/${reportId}`;

  console.log("Fetching report details...");

  const reportResponse = await fetch(reportUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!reportResponse.ok) {
    const errorText = await reportResponse.text();
    console.error("[AUDIT] Report fetch error:", errorText);
    throw new Error(USER_ERROR_MESSAGES.resource_not_found);
  }

  const reportData = await reportResponse.json();
  console.log("Report details fetched:", reportData.name);

  // Now generate embed token
  const embedTokenUrl = `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports/${reportId}/GenerateToken`;

  console.log("Generating embed token...");

  const embedResponse = await fetch(embedTokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      accessLevel: "View",
    }),
  });

  if (!embedResponse.ok) {
    const errorText = await embedResponse.text();
    console.error("[AUDIT] Embed token error:", errorText);
    throw new Error(USER_ERROR_MESSAGES.embed_error);
  }

  const embedData = await embedResponse.json();
  console.log("Embed token generated successfully");

  return {
    embedUrl: reportData.embedUrl,
    embedToken: embedData.token,
    expiration: embedData.expiration,
  };
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

    console.log("[AUDIT] Processing embed request for dashboard:", dashboardId);

    // Get dashboard with credential
    const { data: dashboard, error: dashboardError } = await supabase
      .from("dashboards")
      .select("workspace_id, dashboard_id, report_section, credential_id, owner_id")
      .eq("id", dashboardId)
      .single();

    if (dashboardError || !dashboard) {
      console.error("[AUDIT] Dashboard not found:", dashboardError);
      throw new Error(USER_ERROR_MESSAGES.resource_not_found);
    }

    // Check if user has access (owner or has been granted access)
    const isOwner = dashboard.owner_id === user.id;
    
    if (!isOwner) {
      const { data: access } = await supabase
        .from("user_dashboard_access")
        .select("id")
        .eq("dashboard_id", dashboardId)
        .eq("user_id", user.id)
        .single();

      if (!access) {
        throw new Error(USER_ERROR_MESSAGES.permission_denied);
      }
    }

    if (!dashboard.credential_id) {
      throw new Error(USER_ERROR_MESSAGES.credentials_missing);
    }

    console.log("Processing credential for dashboard:", dashboardId);

    // Get and decrypt credentials via the manage-credentials function
    const encryptionKey = Deno.env.get("ENCRYPTION_KEY");
    let credential: PowerBIConfig;

    if (encryptionKey) {
      // Use decryption for encrypted credentials
      const { data: credData, error: credError } = await supabase
        .from("power_bi_configs")
        .select("client_id, client_secret, tenant_id, username, password")
        .eq("id", dashboard.credential_id)
        .single();

      if (credError || !credData) {
        console.error("[AUDIT] Credential not found:", credError);
        throw new Error(USER_ERROR_MESSAGES.credentials_missing);
      }

      // Decrypt sensitive fields
      credential = {
        client_id: credData.client_id,
        client_secret: await decryptValue(credData.client_secret, encryptionKey),
        tenant_id: credData.tenant_id,
        username: credData.username,
        password: await decryptValue(credData.password || "", encryptionKey),
      };
    } else {
      // Fallback for unencrypted credentials (backward compatibility)
      const { data: credData, error: credError } = await supabase
        .from("power_bi_configs")
        .select("client_id, client_secret, tenant_id, username, password")
        .eq("id", dashboard.credential_id)
        .single();

      if (credError || !credData) {
        console.error("[AUDIT] Credential not found:", credError);
        throw new Error(USER_ERROR_MESSAGES.credentials_missing);
      }

      credential = credData as PowerBIConfig;
    }

    // Validate required fields
    if (!credential.username || !credential.password) {
      throw new Error(USER_ERROR_MESSAGES.credentials_missing);
    }

    // Get Azure AD access token using Master User auth
    const accessToken = await getAzureAccessToken(credential);

    // Get embed token
    const embedData = await getReportEmbedToken(
      accessToken,
      dashboard.workspace_id,
      dashboard.dashboard_id
    );

    console.log("Embed data generated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        ...embedData,
        reportSection: dashboard.report_section,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[AUDIT] Error in get-powerbi-embed:", error.message);
    
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
