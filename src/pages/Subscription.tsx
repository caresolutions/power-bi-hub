import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, CreditCard, Check, Crown, Settings, Loader2, Infinity } from "lucide-react";
import { motion } from "framer-motion";

interface SubscriptionPlan {
  id: string;
  plan_key: string;
  name: string;
  price_monthly: number;
  description: string | null;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  is_custom: boolean;
  trial_days: number;
}

interface PlanLimit {
  limit_key: string;
  limit_value: number | null;
  is_unlimited: boolean;
}

interface SubscriptionStatus {
  subscribed: boolean;
  status: string;
  planKey: string | null;
  productId: string | null;
  subscriptionEnd: string | null;
  isTrialing: boolean;
  isMasterManaged: boolean;
  trialDaysRemaining: number;
}

const Subscription = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [planLimits, setPlanLimits] = useState<Record<string, PlanLimit[]>>({});
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    checkAuth();
    fetchPlansAndSubscription();
    
    // Handle success/cancel from Stripe
    if (searchParams.get("success") === "true") {
      toast({
        title: "Assinatura realizada!",
        description: "Sua assinatura foi processada com sucesso.",
      });
      // Refresh subscription status
      setTimeout(() => {
        checkSubscription();
      }, 2000);
    } else if (searchParams.get("canceled") === "true") {
      toast({
        title: "Checkout cancelado",
        description: "O processo de checkout foi cancelado.",
        variant: "destructive",
      });
    }
  }, [searchParams]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData?.role !== 'admin') {
      navigate("/home");
    }
  };

  const fetchPlansAndSubscription = async () => {
    try {
      // Fetch plans from database
      const { data: plansData, error: plansError } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (plansError) throw plansError;

      setPlans(plansData || []);

      // Fetch limits for each plan
      const limitsMap: Record<string, PlanLimit[]> = {};
      for (const plan of plansData || []) {
        const { data: limits } = await supabase
          .from("plan_limits")
          .select("limit_key, limit_value, is_unlimited")
          .eq("plan_id", plan.id);
        
        limitsMap[plan.id] = limits || [];
      }
      setPlanLimits(limitsMap);

      // Check subscription status
      await checkSubscription();
    } catch (error: any) {
      console.error("Error fetching plans:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar planos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;
      setSubscriptionStatus(data);
    } catch (error: any) {
      console.error("Error checking subscription:", error);
    }
  };

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    // Enterprise is custom - contact sales
    if (plan.is_custom) {
      window.location.href = "mailto:contato@care-business.com?subject=Interesse no plano Enterprise";
      return;
    }

    if (!plan.stripe_price_id) {
      toast({
        title: "Erro",
        description: "Este plano ainda não está configurado para pagamento.",
        variant: "destructive",
      });
      return;
    }

    setCheckoutLoading(plan.id);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: plan.stripe_price_id }
      });

      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error("Error creating checkout:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar sessão de checkout.",
        variant: "destructive",
      });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error("Error opening customer portal:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao abrir portal do cliente.",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const isCurrentPlan = (plan: SubscriptionPlan): boolean => {
    if (!subscriptionStatus?.planKey) return false;
    return plan.plan_key === subscriptionStatus.planKey;
  };

  const getLimitLabel = (limitKey: string): string => {
    const labels: Record<string, string> = {
      users: "Usuários",
      dashboards: "Dashboards",
      credentials: "Credenciais Power BI"
    };
    return labels[limitKey] || limitKey;
  };

  const formatLimitValue = (limit: PlanLimit): string => {
    if (limit.is_unlimited) return "Ilimitado";
    return String(limit.limit_value || 0);
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-hero opacity-30" />
      
      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-card/30 backdrop-blur">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate("/home")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <div className="flex items-center gap-3">
                <div className="bg-amber-500/10 p-2 rounded-lg">
                  <CreditCard className="h-6 w-6 text-amber-500" />
                </div>
                <h1 className="text-2xl font-bold">Assinatura</h1>
              </div>
            </div>
            
            {subscriptionStatus?.subscribed && !subscriptionStatus.isMasterManaged && (
              <Button
                variant="outline"
                onClick={handleManageSubscription}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Settings className="mr-2 h-4 w-4" />
                )}
                Gerenciar Assinatura
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Escolha seu plano</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Selecione o plano ideal para suas necessidades. Todos incluem 7 dias de trial gratuito.
          </p>
          {subscriptionStatus?.subscribed && subscriptionStatus.planKey && (
            <div className="mt-4 inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
              <Crown className="h-4 w-4 text-primary" />
              <span className="text-sm">
                Plano atual: <span className="font-bold">
                  {plans.find(p => p.plan_key === subscriptionStatus.planKey)?.name || subscriptionStatus.planKey}
                </span>
                {subscriptionStatus.isTrialing && (
                  <span className="ml-2 text-amber-500">
                    (Trial - {subscriptionStatus.trialDaysRemaining} dias restantes)
                  </span>
                )}
              </span>
            </div>
          )}
          {subscriptionStatus?.isMasterManaged && (
            <div className="mt-4 inline-flex items-center gap-2 bg-purple-500/10 px-4 py-2 rounded-full">
              <Crown className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-purple-500">
                Assinatura gerenciada pelo administrador master
              </span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground mt-4">Carregando planos...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {plans.map((plan, index) => {
              const current = isCurrentPlan(plan);
              const limits = planLimits[plan.id] || [];
              const isHighlighted = plan.plan_key === 'growth';
              
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card 
                    className={`glass p-6 border-border/50 relative overflow-hidden h-full flex flex-col ${
                      current 
                        ? "border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]" 
                        : isHighlighted 
                          ? "border-primary shadow-glow" 
                          : "hover:border-primary/50"
                    } transition-all duration-300`}
                  >
                    {current && (
                      <div className="absolute top-4 right-4">
                        <span className="bg-green-500 text-white text-xs px-3 py-1 rounded-full font-medium">
                          Seu plano
                        </span>
                      </div>
                    )}
                    {!current && isHighlighted && (
                      <div className="absolute top-4 right-4">
                        <span className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-medium">
                          Popular
                        </span>
                      </div>
                    )}
                    
                    <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                    
                    <div className="mb-4">
                      {plan.is_custom ? (
                        <div>
                          <span className="text-2xl font-bold">Sob consulta</span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-3xl font-bold">{formatPrice(plan.price_monthly)}</span>
                          <span className="text-muted-foreground">/mês</span>
                        </div>
                      )}
                      {!plan.is_custom && (
                        <p className="text-sm text-primary mt-1 font-medium">
                          {plan.trial_days} dias grátis
                        </p>
                      )}
                    </div>
                    
                    {plan.description && (
                      <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                    )}
                    
                    <ul className="space-y-2 mb-6 flex-grow">
                      {limits.map((limit) => (
                        <li key={limit.limit_key} className="flex items-center gap-2">
                          {limit.is_unlimited ? (
                            <Infinity className="h-4 w-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          )}
                          <span className="text-sm">
                            {formatLimitValue(limit)} {getLimitLabel(limit.limit_key)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button
                      className={`w-full ${
                        isHighlighted && !current
                          ? "bg-primary hover:bg-primary/90 shadow-glow" 
                          : ""
                      }`}
                      variant={isHighlighted && !current ? "default" : "outline"}
                      onClick={() => handleSelectPlan(plan)}
                      disabled={checkoutLoading !== null || subscriptionStatus?.isMasterManaged}
                    >
                      {checkoutLoading === plan.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processando...
                        </>
                      ) : plan.is_custom ? (
                        "Falar com vendas"
                      ) : current && subscriptionStatus?.isTrialing ? (
                        "Assinar agora"
                      ) : current && subscriptionStatus?.subscribed ? (
                        "Renovar"
                      ) : (
                        "Assinar"
                      )}
                    </Button>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="mt-12 text-center">
          <Button
            variant="ghost"
            onClick={checkSubscription}
            className="text-muted-foreground"
          >
            Atualizar status da assinatura
          </Button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Precisa de um plano personalizado?{" "}
            <a href="mailto:contato@care-business.com" className="text-primary hover:underline">
              Entre em contato
            </a>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Subscription;