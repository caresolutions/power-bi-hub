import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// Module-level tracking with timestamps to prevent duplicate logs from React StrictMode
// but allow multiple genuine accesses throughout the day
const recentLogs = new Map<string, number>();

// Debounce time in milliseconds (5 seconds should be enough to catch StrictMode double-mounting)
const DEBOUNCE_MS = 5000;

export function useAccessLog() {
  const logDashboardAccess = useCallback(async (dashboardId: string) => {
    const now = Date.now();
    const lastLogTime = recentLogs.get(dashboardId);

    // If this dashboard was logged less than DEBOUNCE_MS ago, skip (likely StrictMode duplicate)
    if (lastLogTime && now - lastLogTime < DEBOUNCE_MS) {
      console.log("Skipping duplicate access log (debounce):", dashboardId);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Mark as logged immediately to prevent race conditions
      recentLogs.set(dashboardId, now);

      // Get user's company_id from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .maybeSingle();

      // Insert access log
      await supabase.from("dashboard_access_logs").insert({
        dashboard_id: dashboardId,
        user_id: user.id,
        company_id: profile?.company_id || null,
        user_agent: navigator.userAgent,
      });
      
      console.log("Dashboard access logged successfully:", dashboardId);
    } catch (error) {
      console.error("Error logging dashboard access:", error);
      // Remove from tracking if insertion failed
      recentLogs.delete(dashboardId);
    }
  }, []);

  return { logDashboardAccess };
}
