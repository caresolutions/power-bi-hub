import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  BarChart3, 
  Users, 
  Settings, 
  CheckCircle2, 
  X,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { useEffect } from "react";

const OnboardingBanner = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    progress,
    isLoading,
    isOnboardingComplete,
    pendingSteps,
    markViewedDashboards,
    markInvitedUsers,
    markViewedSettings,
    dismissOnboarding,
  } = useOnboardingProgress();

  // Mark steps as viewed based on current route
  useEffect(() => {
    if (location.pathname === "/dashboards" || location.pathname.startsWith("/dashboard/")) {
      markViewedDashboards();
    } else if (location.pathname === "/users" || location.pathname === "/add-users") {
      markInvitedUsers();
    } else if (location.pathname === "/settings") {
      markViewedSettings();
    }
  }, [location.pathname]);

  // Don't show if loading, complete, or on onboarding page
  if (isLoading || isOnboardingComplete || location.pathname === "/onboarding") {
    return null;
  }

  // Only show after initial onboarding is done (dashboards created)
  if (!progress.dashboardsCreated) {
    return null;
  }

  const steps = [
    {
      id: "dashboards",
      icon: BarChart3,
      title: "Ver Dashboards",
      completed: progress.viewedDashboards,
      path: "/dashboards",
    },
    {
      id: "users",
      icon: Users,
      title: "Convidar Usuários",
      completed: progress.invitedUsers,
      path: "/users",
    },
    {
      id: "settings",
      icon: Settings,
      title: "Personalizar",
      completed: progress.viewedSettings,
      path: "/settings",
    },
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progressPercent = (completedCount / steps.length) * 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed bottom-4 right-4 z-50 w-80"
      >
        <div className="bg-card/95 backdrop-blur-md border border-border/50 rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary/20 to-primary/10 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Primeiros Passos</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={dismissOnboarding}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="px-4 pt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Progresso</span>
              <span>{completedCount}/{steps.length} concluído</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="h-full bg-primary rounded-full"
              />
            </div>
          </div>

          {/* Steps */}
          <div className="p-3 space-y-2">
            {steps.map((step) => (
              <motion.button
                key={step.id}
                onClick={() => !step.completed && navigate(step.path)}
                disabled={step.completed}
                className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all ${
                  step.completed
                    ? "bg-muted/30 opacity-60 cursor-default"
                    : "bg-muted/50 hover:bg-primary/10 hover:border-primary/30 border border-transparent cursor-pointer"
                }`}
                whileHover={!step.completed ? { scale: 1.02 } : {}}
                whileTap={!step.completed ? { scale: 0.98 } : {}}
              >
                <div className={`p-1.5 rounded-md ${
                  step.completed ? "bg-green-500/20" : "bg-primary/20"
                }`}>
                  {step.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <step.icon className="h-4 w-4 text-primary" />
                  )}
                </div>
                <span className={`flex-1 text-sm font-medium ${
                  step.completed ? "line-through text-muted-foreground" : ""
                }`}>
                  {step.title}
                </span>
                {!step.completed && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </motion.button>
            ))}
          </div>

          {/* Dismiss Link */}
          <div className="px-4 pb-3 text-center">
            <button
              onClick={dismissOnboarding}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Dispensar tutorial
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OnboardingBanner;
