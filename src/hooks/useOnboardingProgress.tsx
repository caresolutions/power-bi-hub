import { useState, useEffect } from "react";

interface OnboardingProgress {
  credentialsConfigured: boolean;
  dashboardsCreated: boolean;
  viewedDashboards: boolean;
  invitedUsers: boolean;
  viewedSettings: boolean;
  dismissed: boolean;
  completedAt?: string;
}

const STORAGE_KEY = "onboarding_progress";

const defaultProgress: OnboardingProgress = {
  credentialsConfigured: false,
  dashboardsCreated: false,
  viewedDashboards: false,
  invitedUsers: false,
  viewedSettings: false,
  dismissed: false,
};

export function useOnboardingProgress() {
  const [progress, setProgress] = useState<OnboardingProgress>(defaultProgress);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setProgress(JSON.parse(stored));
      } catch {
        setProgress(defaultProgress);
      }
    }
    setIsLoading(false);
  }, []);

  const updateProgress = (updates: Partial<OnboardingProgress>) => {
    const newProgress = { ...progress, ...updates };
    setProgress(newProgress);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
  };

  const markCredentialsConfigured = () => updateProgress({ credentialsConfigured: true });
  const markDashboardsCreated = () => updateProgress({ dashboardsCreated: true });
  const markViewedDashboards = () => updateProgress({ viewedDashboards: true });
  const markInvitedUsers = () => updateProgress({ invitedUsers: true });
  const markViewedSettings = () => updateProgress({ viewedSettings: true });
  
  const dismissOnboarding = () => {
    updateProgress({ 
      dismissed: true, 
      completedAt: new Date().toISOString() 
    });
  };

  const resetOnboarding = () => {
    setProgress(defaultProgress);
    localStorage.removeItem(STORAGE_KEY);
  };

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
