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

interface PowerBIRefresh {
  requestId: string;
  id: number;
  refreshType: string;
  startTime: string;
  endTime?: string;
  status: string;
  serviceExceptionJson?: string;
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
    throw new Error(`Failed to get Azure AD token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Get dataset ID from report
async function getDatasetFromReport(
  accessToken: string,
  workspaceId: string,
  reportId: string
): Promise<string> {
  const reportUrl = `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports/${reportId}`;

  const response = await fetch(reportUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch report: ${response.status}`);
  }

  const reportData = await response.json();
  return reportData.datasetId;
}

// Get refresh history from Power BI
async function getRefreshHistory(
  accessToken: string,
  workspaceId: string,
  datasetId: string
): Promise<PowerBIRefresh[]> {
  const refreshUrl = `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/datasets/${datasetId}/refreshes?$top=20`;

  const response = await fetch(refreshUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Refresh history fetch error:", errorText);
    throw new Error(`Failed to fetch refresh history: ${response.status}`);
  }

  const data = await response.json();
  return data.value || [];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log("Starting sync-refresh-history job...");

    // Get all dashboards with credentials that have dataset_id
    const { data: dashboards, error: dashboardsError } = await supabase
      .from("dashboards")
      .select("id, workspace_id, dashboard_id, credential_id, dataset_id, owner_id")
      .not("credential_id", "is", null)
      .eq("embed_type", "workspace_id");

    if (dashboardsError) {
      throw new Error(`Failed to fetch dashboards: ${dashboardsError.message}`);
    }

    if (!dashboards || dashboards.length === 0) {
      console.log("No dashboards with credentials found");
      return new Response(
        JSON.stringify({ success: true, message: "No dashboards to sync" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${dashboards.length} dashboards to sync`);

    const encryptionKey = Deno.env.get("ENCRYPTION_KEY");
    
    // Group dashboards by credential to avoid redundant token requests
    const credentialMap = new Map<string, typeof dashboards>();
    for (const dashboard of dashboards) {
      if (!dashboard.credential_id) continue;
      
      const existing = credentialMap.get(dashboard.credential_id) || [];
      existing.push(dashboard);
      credentialMap.set(dashboard.credential_id, existing);
    }

    let syncedCount = 0;
    let errorCount = 0;

    for (const [credentialId, credDashboards] of credentialMap) {
      try {
        // Get and decrypt credentials
        const { data: credData, error: credError } = await supabase
          .from("power_bi_configs")
          .select("client_id, client_secret, tenant_id, username, password")
          .eq("id", credentialId)
          .single();

        if (credError || !credData) {
          console.error(`Credential ${credentialId} not found`);
          continue;
        }

        let credential: PowerBIConfig;
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

        for (const dashboard of credDashboards) {
          try {
            // Get dataset ID if not stored
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
                .eq("id", dashboard.id);
            }

            // Get refresh history from Power BI
            const refreshes = await getRefreshHistory(
              accessToken,
              dashboard.workspace_id,
              datasetId
            );

            console.log(`Dashboard ${dashboard.id}: Found ${refreshes.length} refreshes`);

            // Calculate 72 hours ago
            const cutoffDate = new Date();
            cutoffDate.setHours(cutoffDate.getHours() - 72);

            for (const refresh of refreshes) {
              // Only process refreshes within last 72 hours
              const startTime = new Date(refresh.startTime);
              if (startTime < cutoffDate) continue;

              // Check if this refresh already exists (by request ID or start time match)
              const { data: existing } = await supabase
                .from("dashboard_refresh_history")
                .select("id")
                .eq("dashboard_id", dashboard.id)
                .eq("started_at", refresh.startTime)
                .maybeSingle();

              if (existing) continue; // Already synced

              // Map Power BI status to our status
              let status = "pending";
              if (refresh.status === "Completed") status = "completed";
              else if (refresh.status === "Failed") status = "failed";
              else if (refresh.status === "Cancelled") status = "failed";
              else if (refresh.status === "Unknown") status = "pending";

              // Parse error message if failed
              let errorMessage = null;
              if (refresh.serviceExceptionJson && refresh.status === "Failed") {
                try {
                  const parsed = JSON.parse(refresh.serviceExceptionJson);
                  errorMessage = parsed.errorDescription || parsed.message || "Erro desconhecido";
                } catch {
                  errorMessage = "Falha na atualização";
                }
              }

              // Insert the refresh history
              const { error: insertError } = await supabase
                .from("dashboard_refresh_history")
                .insert({
                  dashboard_id: dashboard.id,
                  user_id: dashboard.owner_id,
                  started_at: refresh.startTime,
                  completed_at: refresh.endTime || null,
                  status,
                  error_message: errorMessage,
                });

              if (insertError) {
                console.error(`Failed to insert refresh for dashboard ${dashboard.id}:`, insertError);
              } else {
                syncedCount++;
              }
            }
          } catch (dashError: any) {
            console.error(`Error syncing dashboard ${dashboard.id}:`, dashError.message);
            errorCount++;
          }
        }
      } catch (credErr: any) {
        console.error(`Error with credential ${credentialId}:`, credErr.message);
        errorCount++;
      }
    }

    // Clean up old history entries (older than 72 hours)
    const cleanupCutoff = new Date();
    cleanupCutoff.setHours(cleanupCutoff.getHours() - 72);
    
    const { error: deleteError } = await supabase
      .from("dashboard_refresh_history")
      .delete()
      .lt("started_at", cleanupCutoff.toISOString());

    if (deleteError) {
      console.error("Error cleaning up old history:", deleteError);
    }

    console.log(`Sync completed: ${syncedCount} refreshes synced, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: syncedCount,
        errors: errorCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in sync-refresh-history:", error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
