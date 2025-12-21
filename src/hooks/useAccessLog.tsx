import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAccessLog() {
  // Track which dashboards have been logged in this session to prevent duplicates
  const loggedDashboards = useRef<Set<string>>(new Set());

  const logDashboardAccess = useCallback(async (dashboardId: string) => {
    // Prevent duplicate logs for the same dashboard in the same session
    if (loggedDashboards.current.has(dashboardId)) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Mark as logged before making the request to prevent race conditions
      loggedDashboards.current.add(dashboardId);

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
    } catch (error) {
      console.error("Error logging dashboard access:", error);
      // Remove from logged set if insertion failed
      loggedDashboards.current.delete(dashboardId);
    }
  }, []);

  const resetLoggedDashboards = useCallback(() => {
    loggedDashboards.current.clear();
  }, []);

  return { logDashboardAccess, resetLoggedDashboards };
}
