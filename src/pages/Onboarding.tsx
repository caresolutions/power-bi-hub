import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import ConfigStep from "@/components/onboarding/ConfigStep";
import DashboardStep from "@/components/onboarding/DashboardStep";
import { Check } from "lucide-react";

const Onboarding = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [configData, setConfigData] = useState({
    clientId: "",
    clientSecret: "",
    tenantId: "",
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
    }
  };

  const handleConfigSubmit = async (data: typeof configData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("power_bi_configs")
        .insert({
          user_id: user.id,
          client_id: data.clientId,
          client_secret: data.clientSecret,
          tenant_id: data.tenantId,
        });

      if (error) throw error;

      setConfigData(data);
      setCurrentStep(2);
      
      toast({
        title: "Configuração salva!",
        description: "Agora vamos adicionar seus dashboards.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleComplete = () => {
    toast({
      title: "Onboarding concluído!",
      description: "Você será redirecionado para o dashboard.",
    });
    navigate("/dashboard");
  };

  const steps = [
    { number: 1, title: "Configuração", completed: currentStep > 1 },
    { number: 2, title: "Dashboards", completed: false },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container max-w-4xl mx-auto py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold mb-4">
            Configuração Inicial
          </h1>
          <p className="text-xl text-muted-foreground">
            Vamos configurar sua conta em 2 passos simples
          </p>
        </motion.div>

        {/* Steps Indicator */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center gap-4">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex flex-col items-center"
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold border-2 transition-all ${
                      step.completed
                        ? "bg-primary text-primary-foreground border-primary"
                        : currentStep === step.number
                        ? "bg-primary/20 border-primary text-primary"
                        : "bg-background border-border text-muted-foreground"
                    }`}
                  >
                    {step.completed ? (
                      <Check className="h-6 w-6" />
                    ) : (
                      step.number
                    )}
                  </div>
                  <span className="text-sm mt-2 font-medium">
                    {step.title}
                  </span>
                </motion.div>

                {index < steps.length - 1 && (
                  <div
                    className={`w-24 h-0.5 mx-4 transition-colors ${
                      step.completed ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="glass p-8 border-border/50">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <ConfigStep onSubmit={handleConfigSubmit} />
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <DashboardStep onComplete={handleComplete} />
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {currentStep === 2 && (
          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              onClick={() => setCurrentStep(1)}
            >
              Voltar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
