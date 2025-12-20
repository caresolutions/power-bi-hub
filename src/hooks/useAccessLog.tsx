import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAccessLog() {
  const logDashboardAccess = useCallback(async (dashboardId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
    }
  }, []);

  return { logDashboardAccess };
}
