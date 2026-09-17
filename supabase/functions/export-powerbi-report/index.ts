import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPPORT_CONTACT = "entre em contato com suporte@care-business.com";
const MSG = {
  credentials_missing: `As credenciais do Power BI ainda não foram configuradas. Configure na página de Credenciais ou ${SUPPORT_CONTACT}`,
  permission_denied: `Você não tem permissão para exportar este dashboard. Caso acredite que seja um engano, ${SUPPORT_CONTACT}`,
  not_found: `Não conseguimos localizar este dashboard. Revise as configurações ou ${SUPPORT_CONTACT}`,
  auth_failed: `Os dados de credenciais estão incorretos, revise ou ${SUPPORT_CONTACT}`,
  no_capacity: `A exportação para PDF/PowerPoint exige que o workspace esteja em uma capacidade paga (Premium, PPU, Fabric F-SKU ou Embedded A-SKU). Verifique a licença do workspace no Power BI ou ${SUPPORT_CONTACT}`,
  timeout: `A exportação demorou mais do que o esperado. Tente novamente com menos páginas ou ${SUPPORT_CONTACT}`,
  service_error: `Não conseguimos concluir a exportação no momento. Tente novamente em instantes ou ${SUPPORT_CONTACT}`,
};

async function decryptValue(ciphertext: string, keyString: string): Promise<string> {
  if (!ciphertext) return "";
  try {
    const keyData = new TextEncoder().encode(keyString.padEnd(32, "0").slice(0, 32));
    const key = await crypto.subtle.importKey("raw", keyData, { name: "AES-GCM" }, false, ["decrypt"]);
    const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: combined.slice(0, 12) },
      key,
      combined.slice(12),
    );
    return new TextDecoder().decode(decrypted);
  } catch (_e) {
    return ciphertext;
  }
}

async function getAzureAccessToken(cfg: any): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${cfg.tenant_id}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    grant_type: "password",
    client_id: cfg.client_id,
    client_secret: cfg.client_secret,
    scope: "https://analysis.windows.net/powerbi/api/.default",
    username: cfg.username,
    password: cfg.password,
  });
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error("[EXPORT] Azure AD token error:", txt);
    throw new Error(MSG.auth_failed);
  }
  return (await res.json()).access_token;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error(MSG.permission_denied);
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) throw new Error(MSG.permission_denied);

    const { dashboardId, format = "PDF", scope = "all", pages, bookmarkState } = await req.json();
    const fileFormat = format === "PPTX" ? "PPTX" : "PDF";

    if (!dashboardId) throw new Error(MSG.not_found);

    const { data: dashboard } = await supabase
      .from("dashboards")
      .select("id, name, workspace_id, dashboard_id, credential_id, owner_id, company_id")
      .eq("id", dashboardId)
      .single();

    if (!dashboard) throw new Error(MSG.not_found);

    // Access check (mirrors get-powerbi-embed)
    if (dashboard.owner_id !== user.id) {
      const { data: isMaster } = await supabase.rpc("is_master_admin", { _user_id: user.id });
      if (!isMaster) {
        const { data: profile } = await supabase
          .from("profiles").select("company_id").eq("id", user.id).maybeSingle();
        const sameCompany = profile?.company_id && dashboard.company_id &&
          profile.company_id === dashboard.company_id;
        if (!sameCompany) {
          const { data: direct } = await supabase
            .from("user_dashboard_access").select("id")
            .eq("dashboard_id", dashboardId).eq("user_id", user.id).maybeSingle();
          if (!direct) {
            const { data: groupAccess } = await supabase.rpc("has_group_dashboard_access", {
              _user_id: user.id, _dashboard_id: dashboardId,
            });
            if (!groupAccess) throw new Error(MSG.permission_denied);
          }
        }
      }
    }

    if (!dashboard.credential_id) throw new Error(MSG.credentials_missing);

    const { data: credData } = await supabase
      .from("power_bi_configs")
      .select("client_id, client_secret, tenant_id, username, password")
      .eq("id", dashboard.credential_id)
      .single();
    if (!credData) throw new Error(MSG.credentials_missing);

    const encryptionKey = Deno.env.get("ENCRYPTION_KEY");
    const credential = encryptionKey
      ? {
        ...credData,
        client_secret: await decryptValue(credData.client_secret, encryptionKey),
        password: await decryptValue(credData.password || "", encryptionKey),
      }
      : credData;

    const accessToken = await getAzureAccessToken(credential);
    const workspaceId = dashboard.workspace_id;
    const reportId = dashboard.dashboard_id;

    const reportConfig: Record<string, unknown> = {};
    if (scope !== "all" && Array.isArray(pages) && pages.length > 0) {
      reportConfig.pages = pages.map((p: string) => ({ pageName: p }));
    }
    if (bookmarkState) {
      reportConfig.defaultBookmark = { state: bookmarkState };
    }

    const exportBody: Record<string, unknown> = { format: fileFormat };
    if (Object.keys(reportConfig).length > 0) {
      exportBody.powerBIReportConfiguration = reportConfig;
    }

    console.log("[EXPORT] Starting export", { workspaceId, reportId, fileFormat, scope });

    const startRes = await fetch(
      `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports/${reportId}/ExportTo`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(exportBody),
      },
    );

    if (!startRes.ok) {
      const txt = await startRes.text();
      console.error("[EXPORT] ExportTo failed:", startRes.status, txt);
      const lower = txt.toLowerCase();
      if (
        startRes.status === 402 || lower.includes("capacity") ||
        lower.includes("notsupported") || lower.includes("premium") ||
        lower.includes("fixedcapacity")
      ) {
        throw new Error(MSG.no_capacity);
      }
      if (startRes.status === 401 || startRes.status === 403) throw new Error(MSG.permission_denied);
      throw new Error(MSG.service_error);
    }

    const exportJob = await startRes.json();
    const exportId = exportJob.id;
    console.log("[EXPORT] Job created:", exportId);

    // Poll until succeeded (max ~110s)
    let status = exportJob.status;
    let resourceLocation: string | null = null;
    const deadline = Date.now() + 110_000;

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 3000));
      const statusRes = await fetch(
        `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports/${reportId}/exports/${exportId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!statusRes.ok) {
        console.error("[EXPORT] Status poll failed:", statusRes.status, await statusRes.text());
        throw new Error(MSG.service_error);
      }
      const statusData = await statusRes.json();
      status = statusData.status;
      console.log("[EXPORT] Status:", status, statusData.percentComplete ?? "");
      if (status === "Succeeded") {
        resourceLocation = statusData.resourceLocation;
        break;
      }
      if (status === "Failed") {
        console.error("[EXPORT] Job failed:", JSON.stringify(statusData));
        throw new Error(MSG.service_error);
      }
    }

    if (status !== "Succeeded" || !resourceLocation) throw new Error(MSG.timeout);

    const fileRes = await fetch(resourceLocation, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!fileRes.ok) {
      console.error("[EXPORT] File download failed:", fileRes.status);
      throw new Error(MSG.service_error);
    }

    const bytes = new Uint8Array(await fileRes.arrayBuffer());
    console.log("[EXPORT] File downloaded, bytes:", bytes.length);

    const safeName = (dashboard.name || "relatorio").replace(/[^\w\-. ]+/g, "_").trim();
    const fileName = `${safeName}.${fileFormat.toLowerCase()}`;

    return new Response(
      JSON.stringify({
        success: true,
        fileName,
        mimeType: fileFormat === "PPTX"
          ? "application/vnd.openxmlformats-officedocument.presentationml.presentation"
          : "application/pdf",
        fileBase64: toBase64(bytes),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("[EXPORT] Error:", error?.message);
    const known = Object.values(MSG) as string[];
    return new Response(
      JSON.stringify({
        success: false,
        error: known.includes(error?.message) ? error.message : MSG.service_error,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
