import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import WelcomeStep from "@/components/onboarding/WelcomeStep";
import CredentialsStep from "@/components/onboarding/CredentialsStep";
import AddDashboardStep from "@/components/onboarding/AddDashboardStep";
import CompletionStep from "@/components/onboarding/CompletionStep";
import { Check, ChevronRight } from "lucide-react";

type OnboardingStep = "welcome" | "credentials" | "dashboards" | "complete";

interface ParsedDashboard {
  name: string;
  description: string;
  url: string;
  workspaceId: string;
  dashboardId: string;
  reportSection: string;
}

const Onboarding = () => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState("Empresa");
  const [credentialId, setCredentialId] = useState<string | null>(null);
  const [dashboardsCount, setDashboardsCount] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    // Load company name
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (profile?.company_id) {
      const { data: company } = await supabase
        .from("companies")
        .select("name")
        .eq("id", profile.company_id)
        .single();

      if (company) {
        setCompanyName(company.name);
      }
    }
  };

  const handleCredentialsSubmit = async (data: {
    name: string;
    clientId: string;
    clientSecret: string;
    tenantId: string;
    username: string;
    password: string;
  }) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Get user's company_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      // Use edge function to create encrypted credentials
      const { data: result, error } = await supabase.functions.invoke("manage-credentials", {
        body: {
          action: "create",
          name: data.name,
          clientId: data.clientId,
          clientSecret: data.clientSecret,
          tenantId: data.tenantId,
          username: data.username,
          password: data.password,
          companyId: profile?.company_id,
        },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      setCredentialId(result.id);
      setCurrentStep("dashboards");
      
      toast({
        title: "Credenciais salvas!",
        description: "Agora vamos adicionar seus dashboards.",
      });
    } catch (error: any) {
      console.error("Error saving credentials:", error);
      toast({
        title: "Erro ao salvar credenciais",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDashboardsComplete = async (dashboards: ParsedDashboard[]) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Get user's company_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      const { error } = await supabase
        .from("dashboards")
        .insert(
          dashboards.map((dashboard) => ({
            owner_id: user.id,
            company_id: profile?.company_id,
            name: dashboard.name,
            description: dashboard.description || null,
            workspace_id: dashboard.workspaceId,
            dashboard_id: dashboard.dashboardId,
            report_section: dashboard.reportSection,
            credential_id: credentialId,
          }))
        );

      if (error) throw error;

      setDashboardsCount(dashboards.length);
      setCurrentStep("complete");
      
      toast({
        title: "Dashboards salvos!",
        description: `${dashboards.length} dashboard${dashboards.length > 1 ? 's' : ''} configurado${dashboards.length > 1 ? 's' : ''} com sucesso.`,
      });
    } catch (error: any) {
      console.error("Error saving dashboards:", error);
      toast({
        title: "Erro ao salvar dashboards",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate("/home");
  };

  const steps = [
    { key: "welcome", number: 1, title: "Início" },
    { key: "credentials", number: 2, title: "Credenciais" },
    { key: "dashboards", number: 3, title: "Dashboards" },
    { key: "complete", number: 4, title: "Concluído" },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === currentStep);

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-hero opacity-30" />
      
      <div className="relative z-10 container max-w-2xl mx-auto py-8 px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-1 mb-4">
            <span className="text-2xl font-bold text-foreground">care</span>
            <ChevronRight className="h-5 w-5 text-primary" />
            <ChevronRight className="h-5 w-5 text-primary -ml-3" />
          </div>
        </motion.div>

        {/* Steps Indicator - Hide on welcome and complete */}
        {currentStep !== "welcome" && currentStep !== "complete" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center mb-8"
          >
            <div className="flex items-center gap-2">
              {steps.slice(1, -1).map((step, index) => {
                const stepIndex = index + 1;
                const isCompleted = currentStepIndex > stepIndex;
                const isCurrent = currentStepIndex === stepIndex;
                
                return (
                  <div key={step.key} className="flex items-center">
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="flex flex-col items-center"
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm border-2 transition-all ${
                          isCompleted
                            ? "bg-primary text-primary-foreground border-primary"
                            : isCurrent
                            ? "bg-primary/20 border-primary text-primary"
                            : "bg-background border-border text-muted-foreground"
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          step.number - 1
                        )}
                      </div>
                      <span className={`text-xs mt-1.5 font-medium ${
                        isCurrent ? 'text-primary' : 'text-muted-foreground'
                      }`}>
                        {step.title}
                      </span>
                    </motion.div>

                    {index < steps.slice(1, -1).length - 1 && (
                      <div
                        className={`w-12 h-0.5 mx-2 transition-colors ${
                          isCompleted ? "bg-primary" : "bg-border"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Step Content */}
        <Card className="bg-card/80 backdrop-blur-md p-8 border-border/50 shadow-xl">
          <AnimatePresence mode="wait">
            {currentStep === "welcome" && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <WelcomeStep
                  companyName={companyName}
                  onStart={() => setCurrentStep("credentials")}
                  onSkip={handleSkip}
                />
              </motion.div>
            )}

            {currentStep === "credentials" && (
              <motion.div
                key="credentials"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <CredentialsStep
                  onSubmit={handleCredentialsSubmit}
                  loading={loading}
                />
              </motion.div>
            )}

            {currentStep === "dashboards" && (
              <motion.div
                key="dashboards"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <AddDashboardStep
                  onComplete={handleDashboardsComplete}
                  loading={loading}
                />
              </motion.div>
            )}

            {currentStep === "complete" && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <CompletionStep
                  stats={{ dashboardsCount }}
                  onGoToDashboards={() => navigate("/dashboards")}
                  onInviteUsers={() => navigate("/users")}
                  onGoToSettings={() => navigate("/settings")}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Back button for credentials and dashboards steps */}
        {(currentStep === "credentials" || currentStep === "dashboards") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-center"
          >
            <button
              onClick={() => {
                if (currentStep === "credentials") {
                  setCurrentStep("welcome");
                } else if (currentStep === "dashboards") {
                  setCurrentStep("credentials");
                }
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Voltar
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
