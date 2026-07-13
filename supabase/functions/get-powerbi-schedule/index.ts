import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function decryptValue(ciphertext: string, keyString: string): Promise<string> {
  if (!ciphertext) return "";
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(keyString.padEnd(32, "0").slice(0, 32));
    const key = await crypto.subtle.importKey("raw", keyData, { name: "AES-GCM" }, false, ["decrypt"]);
    const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    return new TextDecoder().decode(decrypted);
  } catch {
    return ciphertext;
  }
}

async function getAzureAccessToken(c: any): Promise<string> {
  const url = `https://login.microsoftonline.com/${c.tenant_id}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    grant_type: "password",
    client_id: c.client_id,
    client_secret: c.client_secret,
    scope: "https://analysis.windows.net/powerbi/api/.default",
    username: c.username,
    password: c.password,
  });
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!r.ok) throw new Error("auth_failed");
  return (await r.json()).access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) throw new Error("Unauthorized");

    const { dashboardId } = await req.json();
    if (!dashboardId) throw new Error("dashboardId required");

    const { data: dashboard, error: dErr } = await supabase
      .from("dashboards")
      .select("workspace_id, dashboard_id, credential_id, dataset_id")
      .eq("id", dashboardId)
      .single();
    if (dErr || !dashboard) throw new Error("Dashboard not found");
    if (!dashboard.credential_id) throw new Error("No credentials");

    const { data: credData, error: cErr } = await supabase
      .from("power_bi_configs")
      .select("client_id, client_secret, tenant_id, username, password")
      .eq("id", dashboard.credential_id)
      .single();
    if (cErr || !credData) throw new Error("Credentials not found");

    const encKey = Deno.env.get("ENCRYPTION_KEY") ?? "";
    const cred = {
      client_id: credData.client_id,
      client_secret: encKey ? await decryptValue(credData.client_secret, encKey) : credData.client_secret,
      tenant_id: credData.tenant_id,
      username: credData.username,
      password: encKey ? await decryptValue(credData.password || "", encKey) : credData.password,
    };

    const token = await getAzureAccessToken(cred);

    // Resolve dataset id if missing
    let datasetId = dashboard.dataset_id;
    if (!datasetId) {
      const rr = await fetch(
        `https://api.powerbi.com/v1.0/myorg/groups/${dashboard.workspace_id}/reports/${dashboard.dashboard_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!rr.ok) throw new Error("Cannot resolve dataset");
      datasetId = (await rr.json()).datasetId;
    }

    // Fetch native Power BI refresh schedule
    const schedResp = await fetch(
      `https://api.powerbi.com/v1.0/myorg/groups/${dashboard.workspace_id}/datasets/${datasetId}/refreshSchedule`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    let schedule: any = null;
    if (schedResp.ok) schedule = await schedResp.json();

    // Fetch latest refresh history from Power BI (top 20)
    const histResp = await fetch(
      `https://api.powerbi.com/v1.0/myorg/groups/${dashboard.workspace_id}/datasets/${datasetId}/refreshes?$top=20`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    let history: any[] = [];
    if (histResp.ok) history = (await histResp.json()).value ?? [];

    return new Response(
      JSON.stringify({ success: true, schedule, history, datasetId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[get-powerbi-schedule]", err.message);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
