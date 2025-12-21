import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// Module-level tracking to prevent duplicate logs across hook instances
const loggedDashboardsThisSession = new Set<string>();

export function useAccessLog() {
  const logDashboardAccess = useCallback(async (dashboardId: string) => {
    // Create a unique key combining dashboard ID with current date to allow daily logging
    const today = new Date().toISOString().split('T')[0];
    const logKey = `${dashboardId}_${today}`;

    // Check sessionStorage first (persists across component remounts)
    const storageKey = 'logged_dashboards';
    const storedLogs = sessionStorage.getItem(storageKey);
    const loggedSet = storedLogs ? new Set(JSON.parse(storedLogs)) : new Set();

    // Prevent duplicate logs for the same dashboard on the same day
    if (loggedSet.has(logKey) || loggedDashboardsThisSession.has(logKey)) {
      console.log("Access already logged for this dashboard today:", dashboardId);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Mark as logged immediately to prevent race conditions
      loggedDashboardsThisSession.add(logKey);
      loggedSet.add(logKey);
      sessionStorage.setItem(storageKey, JSON.stringify([...loggedSet]));

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
      loggedDashboardsThisSession.delete(logKey);
      loggedSet.delete(logKey);
      sessionStorage.setItem(storageKey, JSON.stringify([...loggedSet]));
    }
  }, []);

  return { logDashboardAccess };
}
