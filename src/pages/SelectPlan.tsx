import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Zap, Building2, Crown, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import careLogo from "@/assets/logo_care_azul.png";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Plan {
  id: string;
  name: string;
  plan_key: string;
  price_monthly: number;
  trial_days: number;
  description: string | null;
  display_order: number;
}

interface PlanLimit {
  limit_key: string;
  limit_value: number | null;
  is_unlimited: boolean;
}

interface PlanFeature {
  feature_key: string;
  feature_description: string | null;
  is_enabled: boolean;
}

const planIcons: Record<string, React.ReactNode> = {
  starter: <Sparkles className="h-6 w-6" />,
  growth: <Zap className="h-6 w-6" />,
  scale: <Building2 className="h-6 w-6" />,
  enterprise: <Crown className="h-6 w-6" />,
};

const planColors: Record<string, string> = {
  starter: "from-blue-500 to-cyan-500",
  growth: "from-purple-500 to-pink-500",
  scale: "from-orange-500 to-red-500",
  enterprise: "from-yellow-500 to-amber-500",
};

const SelectPlan = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planLimits, setPlanLimits] = useState<Record<string, PlanLimit[]>>({});
  const [planFeatures, setPlanFeatures] = useState<Record<string, PlanFeature[]>>({});
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [showContactDialog, setShowContactDialog] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      // Fetch active plans
      const { data: plansData, error: plansError } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (plansError) throw plansError;
      setPlans(plansData || []);

      // Fetch limits for all plans
      const { data: limitsData, error: limitsError } = await supabase
        .from("plan_limits")
        .select("*");

      if (!limitsError && limitsData) {
        const limitsByPlan: Record<string, PlanLimit[]> = {};
        limitsData.forEach((limit) => {
          if (!limitsByPlan[limit.plan_id]) {
            limitsByPlan[limit.plan_id] = [];
          }
          limitsByPlan[limit.plan_id].push(limit);
        });
        setPlanLimits(limitsByPlan);
      }

      // Fetch features for all plans
      const { data: featuresData, error: featuresError } = await supabase
        .from("plan_features")
        .select("*");

      if (!featuresError && featuresData) {
        const featuresByPlan: Record<string, PlanFeature[]> = {};
        featuresData.forEach((feature) => {
          if (!featuresByPlan[feature.plan_id]) {
            featuresByPlan[feature.plan_id] = [];
          }
          featuresByPlan[feature.plan_id].push(feature);
        });
        setPlanFeatures(featuresByPlan);
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
      toast.error("Erro ao carregar planos");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (plan: Plan) => {
    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }

    setSelecting(plan.id);

    try {
      // Update subscription with selected plan
      const { error } = await supabase
        .from("subscriptions")
        .update({
          plan: plan.plan_key,
          status: "trial",
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(
            Date.now() + plan.trial_days * 24 * 60 * 60 * 1000
          ).toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success(`Plano ${plan.name} selecionado! Você tem ${plan.trial_days} dias de trial.`);
      
      // Navigate to onboarding
      navigate("/onboarding");
    } catch (error: any) {
      console.error("Error selecting plan:", error);
      toast.error("Erro ao selecionar plano");
    } finally {
      setSelecting(null);
    }
  };

  const formatPrice = (price: number) => {
    if (price === 0) return "Sob consulta";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const getLimitDisplay = (planId: string, key: string): string => {
    const limits = planLimits[planId] || [];
    const limit = limits.find((l) => l.limit_key === key);
    if (!limit) return "-";
    if (limit.is_unlimited) return "Ilimitado";
    return limit.limit_value?.toString() || "-";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-hero opacity-30" />

      <div className="relative z-10 container max-w-6xl mx-auto py-8 px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center mb-6">
            <img src={careLogo} alt="Care" className="h-10 w-auto" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Escolha seu plano
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Selecione o plano ideal para sua empresa. Todos os planos incluem
            período de teste gratuito para você experimentar.
          </p>
        </motion.div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="relative h-full flex flex-col overflow-hidden border-border/50 hover:border-primary/50 transition-all hover:shadow-lg">
                {/* Header with gradient */}
                <div
                  className={`bg-gradient-to-r ${
                    planColors[plan.plan_key] || "from-gray-500 to-gray-600"
                  } p-4 text-white`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {planIcons[plan.plan_key]}
                    <h3 className="font-bold text-lg">{plan.name}</h3>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">
                      {formatPrice(plan.price_monthly)}
                    </span>
                    {plan.price_monthly > 0 && (
                      <span className="text-sm opacity-80">/mês</span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-4 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {plan.description}
                  </p>

                  {plan.trial_days > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {plan.trial_days} dias grátis
                    </Badge>
                  )}

                  {/* Limits */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>
                        <strong>{getLimitDisplay(plan.id, "users")}</strong>{" "}
                        usuários
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>
                        <strong>{getLimitDisplay(plan.id, "dashboards")}</strong>{" "}
                        dashboards
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>
                        <strong>{getLimitDisplay(plan.id, "credentials")}</strong>{" "}
                        credenciais
                      </span>
                    </div>
                  </div>

                  {/* Features */}
                  {planFeatures[plan.id]?.filter((f) => f.is_enabled).length >
                    0 && (
                    <div className="pt-2 border-t border-border/50 space-y-2">
                      {planFeatures[plan.id]
                        ?.filter((f) => f.is_enabled)
                        .slice(0, 3)
                        .map((feature) => (
                          <div
                            key={feature.feature_key}
                            className="flex items-center gap-2 text-sm"
                          >
                            <Check className="h-4 w-4 text-primary" />
                            <span>
                              {feature.feature_description || feature.feature_key}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Action */}
                <div className="p-4 pt-0">
                  {plan.plan_key === "enterprise" ? (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => setShowContactDialog(true)}
                    >
                      Falar com vendas
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={plan.plan_key === "growth" ? "default" : "outline"}
                      onClick={() => handleSelectPlan(plan)}
                      disabled={selecting !== null}
                    >
                      {selecting === plan.id ? (
                        <span className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                          Selecionando...
                        </span>
                      ) : (
                        "Começar trial"
                      )}
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm text-muted-foreground mt-8"
        >
          Você pode alterar ou cancelar seu plano a qualquer momento.
        </motion.p>
      </div>

      {/* Contact Sales Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fale com nossa equipe comercial</DialogTitle>
            <DialogDescription>
              Entre em contato para conhecer o plano Enterprise e suas vantagens exclusivas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <a
              href="mailto:comercial@care-business.com?subject=Interesse no Plano Enterprise"
              className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors group"
            >
              <div className="bg-primary/10 p-3 rounded-full group-hover:bg-primary/20 transition-colors">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Enviar e-mail</p>
                <p className="text-sm text-muted-foreground">comercial@care-business.com</p>
              </div>
            </a>
            <a
              href="tel:+5511997361696"
              className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors group"
            >
              <div className="bg-green-500/10 p-3 rounded-full group-hover:bg-green-500/20 transition-colors">
                <Phone className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="font-medium">Ligar agora</p>
                <p className="text-sm text-muted-foreground">(11) 99736-1696</p>
              </div>
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SelectPlan;
