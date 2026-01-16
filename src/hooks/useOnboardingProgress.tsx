import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface OnboardingProgress {
  credentialsConfigured: boolean;
  dashboardsCreated: boolean;
  viewedDashboards: boolean;
  invitedUsers: boolean;
  viewedSettings: boolean;
  dismissed: boolean;
  completedAt?: string;
}

const defaultProgress: OnboardingProgress = {
  credentialsConfigured: false,
  dashboardsCreated: false,
  viewedDashboards: false,
  invitedUsers: false,
  viewedSettings: false,
  dismissed: false,
};

export function useOnboardingProgress() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<OnboardingProgress>(defaultProgress);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch progress from database
  useEffect(() => {
    const fetchProgress = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("onboarding_progress")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching onboarding progress:", error);
          setIsLoading(false);
          return;
        }

        if (data) {
          setProgress({
            credentialsConfigured: data.credentials_configured,
            dashboardsCreated: data.dashboards_created,
            viewedDashboards: data.viewed_dashboards,
            invitedUsers: data.invited_users,
            viewedSettings: data.viewed_settings,
            dismissed: data.dismissed,
            completedAt: data.completed_at,
          });
        }
      } catch (error) {
        console.error("Error fetching onboarding progress:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgress();
  }, [user]);

  const updateProgress = useCallback(async (updates: Partial<OnboardingProgress>) => {
    if (!user) return;

    const newProgress = { ...progress, ...updates };
    setProgress(newProgress);

    try {
      // Build the update object with proper typing
      const dbUpdates = {
        user_id: user.id,
        credentials_configured: updates.credentialsConfigured ?? progress.credentialsConfigured,
        dashboards_created: updates.dashboardsCreated ?? progress.dashboardsCreated,
        viewed_dashboards: updates.viewedDashboards ?? progress.viewedDashboards,
        invited_users: updates.invitedUsers ?? progress.invitedUsers,
        viewed_settings: updates.viewedSettings ?? progress.viewedSettings,
        dismissed: updates.dismissed ?? progress.dismissed,
        completed_at: updates.completedAt ?? progress.completedAt ?? null,
      };

      const { error } = await supabase
        .from("onboarding_progress")
        .upsert(dbUpdates, { onConflict: "user_id" });

      if (error) {
        console.error("Error updating onboarding progress:", error);
      }
    } catch (error) {
      console.error("Error updating onboarding progress:", error);
    }
  }, [user, progress]);

  const markCredentialsConfigured = useCallback(() => {
    updateProgress({ credentialsConfigured: true });
  }, [updateProgress]);

  const markDashboardsCreated = useCallback(() => {
    updateProgress({ dashboardsCreated: true });
  }, [updateProgress]);

  const markViewedDashboards = useCallback(() => {
    if (!progress.viewedDashboards) {
      updateProgress({ viewedDashboards: true });
    }
  }, [updateProgress, progress.viewedDashboards]);

  const markInvitedUsers = useCallback(() => {
    if (!progress.invitedUsers) {
      updateProgress({ invitedUsers: true });
    }
  }, [updateProgress, progress.invitedUsers]);

  const markViewedSettings = useCallback(() => {
    if (!progress.viewedSettings) {
      updateProgress({ viewedSettings: true });
    }
  }, [updateProgress, progress.viewedSettings]);
  
  const dismissOnboarding = useCallback(() => {
    updateProgress({ 
      dismissed: true, 
      completedAt: new Date().toISOString() 
    });
  }, [updateProgress]);

  const resetOnboarding = useCallback(async () => {
    if (!user) return;
    
    setProgress(defaultProgress);
    
    try {
      await supabase
        .from("onboarding_progress")
        .delete()
        .eq("user_id", user.id);
    } catch (error) {
      console.error("Error resetting onboarding progress:", error);
    }
  }, [user]);

  const isOnboardingComplete = 
    progress.dismissed || 
    (progress.viewedDashboards && progress.invitedUsers && progress.viewedSettings);

  const pendingSteps = [];
  if (!progress.viewedDashboards) pendingSteps.push("dashboards");
  if (!progress.invitedUsers) pendingSteps.push("users");
  if (!progress.viewedSettings) pendingSteps.push("settings");

  return {
    progress,
    isLoading,
    isOnboardingComplete,
    pendingSteps,
    markCredentialsConfigured,
    markDashboardsCreated,
    markViewedDashboards,
    markInvitedUsers,
    markViewedSettings,
    dismissOnboarding,
    resetOnboarding,
  };
}
