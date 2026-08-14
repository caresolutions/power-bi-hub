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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) throw new Error("Unauthorized");

    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "master_admin").maybeSingle();
    if (!roleRow) throw new Error("Forbidden");

    const { credentialId } = await req.json();
    const { data: c } = await supabase
      .from("power_bi_configs")
      .select("id, name, client_id, client_secret, tenant_id, username, password")
      .eq("id", credentialId).single();
    if (!c) throw new Error("Credential not found");

    const encKey = Deno.env.get("ENCRYPTION_KEY") ?? "";
    const clientSecret = encKey ? await decryptValue(c.client_secret, encKey) : c.client_secret;
    const password = encKey ? await decryptValue(c.password ?? "", encKey) : (c.password ?? "");

    const report: any = {
      name: c.name,
      username: c.username,
      tenant_id: c.tenant_id,
      client_id: c.client_id,
      shape: {
        clientIdIsGuid: /^[0-9a-f-]{36}$/i.test(c.client_id),
        tenantIdIsGuid: /^[0-9a-f-]{36}$/i.test(c.tenant_id),
        secretLength: clientSecret.length,
        secretLooksLikeSecretId: /^[0-9a-f-]{36}$/i.test(clientSecret),
        secretHasWhitespace: clientSecret !== clientSecret.trim(),
        passwordLength: password.length,
        passwordHasWhitespace: password !== password.trim(),
        usernameHasWhitespace: (c.username ?? "") !== (c.username ?? "").trim(),
      },
    };

    const tokenUrl = `https://login.microsoftonline.com/${c.tenant_id}/oauth2/v2.0/token`;

    // 1) Client credentials (service principal) - validates client_id + secret only
    const ccResp = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: c.client_id,
        client_secret: clientSecret,
        scope: "https://analysis.windows.net/powerbi/api/.default",
      }).toString(),
    });
    const ccBody = await ccResp.json().catch(() => ({}));
    report.clientCredentials = {
      ok: ccResp.ok,
      status: ccResp.status,
      error: ccBody.error ?? null,
      errorCodes: ccBody.error_codes ?? null,
      description: (ccBody.error_description ?? "").split("Trace ID")[0].trim() || null,
    };

    // 2) ROPC (master user) - what the app uses today
    const ropcResp = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "password",
        client_id: c.client_id,
        client_secret: clientSecret,
        scope: "https://analysis.windows.net/powerbi/api/.default",
        username: c.username ?? "",
        password,
      }).toString(),
    });
    const ropcBody = await ropcResp.json().catch(() => ({}));
    report.masterUser = {
      ok: ropcResp.ok,
      status: ropcResp.status,
      error: ropcBody.error ?? null,
      errorCodes: ropcBody.error_codes ?? null,
      description: (ropcBody.error_description ?? "").split("Trace ID")[0].trim() || null,
    };

    // 3) If we got a token, list workspaces the identity can actually see
    const token = ropcBody.access_token ?? ccBody.access_token;
    if (token) {
      const wsResp = await fetch("https://api.powerbi.com/v1.0/myorg/groups", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (wsResp.ok) {
        const ws = await wsResp.json();
        report.workspaces = (ws.value ?? []).map((w: any) => ({ id: w.id, name: w.name }));
      } else {
        report.workspacesError = { status: wsResp.status, body: (await wsResp.text()).slice(0, 300) };
      }
    }

    return new Response(JSON.stringify({ success: true, report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
