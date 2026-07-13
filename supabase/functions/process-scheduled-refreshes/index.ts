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
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!response.ok) throw new Error(`Azure token error: ${await response.text()}`);
  const data = await response.json();
  return data.access_token;
}

async function getDatasetFromReport(accessToken: string, workspaceId: string, reportId: string): Promise<string> {
  const url = `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports/${reportId}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`Report fetch error: ${await response.text()}`);
  const data = await response.json();
  return data.datasetId;
}

async function refreshDataset(accessToken: string, workspaceId: string, datasetId: string): Promise<void> {
  const url = `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/datasets/${datasetId}/refreshes`;
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ notifyOption: "NoNotification" }),
  });
  if (!response.ok) throw new Error(`Refresh error [${response.status}]: ${await response.text()}`);
}

// Compute next run using the schedule's timezone
function computeNextRun(
  frequency: string,
  timeOfDay: string, // "HH:MM" or "HH:MM:SS"
  timezone: string,
  daysOfWeek: number[] | null,
  dayOfMonth: number | null,
  fromDate: Date = new Date()
): Date {
  const [hh, mm] = timeOfDay.split(":").map((n) => parseInt(n, 10));

  // Get current time in target timezone
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(fromDate).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== "literal") acc[p.type] = p.value;
    return acc;
  }, {});

  const tzYear = parseInt(parts.year, 10);
  const tzMonth = parseInt(parts.month, 10);
  const tzDay = parseInt(parts.day, 10);

  // Helper: build a UTC Date matching a given local (tz) wall-clock date/time
  function toUtcFromTz(y: number, m: number, d: number, h: number, min: number): Date {
    // Start with naive UTC, then adjust by offset difference
    const naiveUtc = Date.UTC(y, m - 1, d, h, min, 0);
    // Determine tz offset at that moment
    const local = new Date(naiveUtc);
    const localFmt = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const lp = localFmt.formatToParts(local).reduce<Record<string, string>>((a, p) => {
      if (p.type !== "literal") a[p.type] = p.value;
      return a;
    }, {});
    const asIfLocal = Date.UTC(
      parseInt(lp.year, 10),
      parseInt(lp.month, 10) - 1,
      parseInt(lp.day, 10),
      parseInt(lp.hour, 10),
      parseInt(lp.minute, 10),
      0
    );
    const offset = asIfLocal - naiveUtc;
    return new Date(naiveUtc - offset);
  }

  const startCandidate = toUtcFromTz(tzYear, tzMonth, tzDay, hh, mm);

  if (frequency === "daily") {
    let candidate = startCandidate;
    if (candidate <= fromDate) {
      const next = new Date(tzYear, tzMonth - 1, tzDay + 1);
      candidate = toUtcFromTz(next.getFullYear(), next.getMonth() + 1, next.getDate(), hh, mm);
    }
    return candidate;
  }

  if (frequency === "weekly") {
    const dows = daysOfWeek && daysOfWeek.length > 0 ? [...daysOfWeek].sort((a, b) => a - b) : [1, 2, 3, 4, 5];
    // Find next matching weekday (0=Sun..6=Sat) in tz
    for (let i = 0; i < 14; i++) {
      const d = new Date(tzYear, tzMonth - 1, tzDay + i);
      const dow = d.getDay();
      if (dows.includes(dow)) {
        const candidate = toUtcFromTz(d.getFullYear(), d.getMonth() + 1, d.getDate(), hh, mm);
        if (candidate > fromDate) return candidate;
      }
    }
    // Fallback
    return new Date(fromDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  if (frequency === "monthly") {
    const dom = dayOfMonth ?? 1;
    for (let i = 0; i < 3; i++) {
      const monthIdx = tzMonth - 1 + i;
      const y = tzYear + Math.floor(monthIdx / 12);
      const m = ((monthIdx % 12) + 12) % 12;
      const candidate = toUtcFromTz(y, m + 1, dom, hh, mm);
      if (candidate > fromDate) return candidate;
    }
  }

  return new Date(fromDate.getTime() + 24 * 60 * 60 * 1000);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const encryptionKey = Deno.env.get("ENCRYPTION_KEY");
  const supabase = createClient(supabaseUrl, supabaseKey);

  const results: Array<{ scheduleId: string; status: string; error?: string }> = [];

  try {
    const now = new Date();

    const { data: dueSchedules, error: schedError } = await supabase
      .from("dashboard_refresh_schedules")
      .select("id, dashboard_id, created_by, frequency, time_of_day, timezone, days_of_week, day_of_month, next_run_at")
      .eq("is_active", true)
      .or(`next_run_at.is.null,next_run_at.lte.${now.toISOString()}`);

    if (schedError) throw schedError;

    console.log(`[SCHEDULER] Found ${dueSchedules?.length ?? 0} due schedules`);

    for (const sched of dueSchedules ?? []) {
      let historyId: string | null = null;
      try {
        // Create history row (schedule-triggered)
        const { data: hist } = await supabase
          .from("dashboard_refresh_history")
          .insert({
            dashboard_id: sched.dashboard_id,
            user_id: sched.created_by,
            status: "pending",
            triggered_by: "schedule",
          })
          .select("id")
          .single();
        historyId = hist?.id ?? null;

        const { data: dashboard, error: dashErr } = await supabase
          .from("dashboards")
          .select("workspace_id, dashboard_id, credential_id, dataset_id")
          .eq("id", sched.dashboard_id)
          .single();
        if (dashErr || !dashboard) throw new Error("Dashboard not found");
        if (!dashboard.credential_id) throw new Error("Credentials missing");

        const { data: credData, error: credErr } = await supabase
          .from("power_bi_configs")
          .select("client_id, client_secret, tenant_id, username, password")
          .eq("id", dashboard.credential_id)
          .single();
        if (credErr || !credData) throw new Error("Credentials not found");

        const cred: PowerBIConfig = encryptionKey
          ? {
              client_id: credData.client_id,
              client_secret: await decryptValue(credData.client_secret, encryptionKey),
              tenant_id: credData.tenant_id,
              username: credData.username,
              password: await decryptValue(credData.password || "", encryptionKey),
            }
          : (credData as PowerBIConfig);

        const accessToken = await getAzureAccessToken(cred);

        let datasetId = dashboard.dataset_id;
        if (!datasetId) {
          datasetId = await getDatasetFromReport(accessToken, dashboard.workspace_id, dashboard.dashboard_id);
          await supabase.from("dashboards").update({ dataset_id: datasetId }).eq("id", sched.dashboard_id);
        }

        await refreshDataset(accessToken, dashboard.workspace_id, datasetId);

        if (historyId) {
          await supabase
            .from("dashboard_refresh_history")
            .update({ status: "completed", completed_at: new Date().toISOString() })
            .eq("id", historyId);
        }

        results.push({ scheduleId: sched.id, status: "ok" });
      } catch (err: any) {
        console.error(`[SCHEDULER] Schedule ${sched.id} failed:`, err.message);
        if (historyId) {
          await supabase
            .from("dashboard_refresh_history")
            .update({
              status: "failed",
              completed_at: new Date().toISOString(),
              error_message: (err.message ?? "Erro").slice(0, 500),
            })
            .eq("id", historyId);
        }
        results.push({ scheduleId: sched.id, status: "failed", error: err.message });
      } finally {
        // Always update last_run_at + next_run_at so we don't loop
        const nextRun = computeNextRun(
          sched.frequency,
          sched.time_of_day as unknown as string,
          sched.timezone,
          sched.days_of_week as number[] | null,
          sched.day_of_month as number | null,
          new Date()
        );
        await supabase
          .from("dashboard_refresh_schedules")
          .update({
            last_run_at: new Date().toISOString(),
            next_run_at: nextRun.toISOString(),
          })
          .eq("id", sched.id);
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[SCHEDULER] Fatal error:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
