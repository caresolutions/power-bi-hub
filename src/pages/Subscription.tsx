import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, CreditCard, Check, Crown, Settings, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

// Stripe product and price mappings
const STRIPE_PLANS = {
  free: {
    productId: "prod_TXiAfvNuN13Bdj",
    priceId: "price_1SackXIanwCICrsHO7wfG1WM",
  },
  pro: {
    productId: "prod_TXiBsq6Urco479",
    priceId: "price_1SackmIanwCICrsHPUOabQqQ",
  },
  enterprise: {
    productId: "prod_TXiB1hRL7kIi0Z",
    priceId: "price_1Sacl7IanwCICrsHcwxFlClE",
  },
};

const plans = [
  {
    id: "free",
    name: "Free",
    price: "R$ 1",
    period: "/mês",
    trial: "7 dias grátis",
    features: [
      "1 Credencial Power BI",
      "3 Dashboards",
      "5 Usuários",
      "Suporte por e-mail"
    ],
    highlighted: false
  },
  {
    id: "pro",
    name: "Profissional",
    price: "R$ 2",
    period: "/mês",
    trial: "7 dias grátis",
    features: [
      "5 Credenciais Power BI",
      "20 Dashboards",
      "50 Usuários",
      "Suporte prioritário",
      "API de integração"
    ],
    highlighted: true
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "R$ 3",
    period: "/mês",
    trial: "7 dias grátis",
    features: [
      "Credenciais ilimitadas",
      "Dashboards ilimitados",
      "Usuários ilimitados",
      "Suporte 24/7",
      "API de integração",
      "SLA garantido"
    ],
    highlighted: false
  }
];

interface SubscriptionStatus {
  subscribed: boolean;
  productId: string | null;
  subscriptionEnd: string | null;
  isTrialing: boolean;
}

const Subscription = () => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    checkAuth();
    checkSubscription();
    
    // Handle success/cancel from Stripe
    if (searchParams.get("success") === "true") {
      toast({
        title: "Assinatura realizada!",
        description: "Sua assinatura foi processada com sucesso.",
      });
      checkSubscription();
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

  const checkSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;
      setSubscriptionStatus(data);
    } catch (error: any) {
      console.error("Error checking subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (planId: string) => {
    const plan = STRIPE_PLANS[planId as keyof typeof STRIPE_PLANS];
    if (!plan) return;

    setCheckoutLoading(planId);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: plan.priceId }
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

  const getCurrentPlanId = (): string | null => {
    if (!subscriptionStatus?.productId) return null;
    
    for (const [key, value] of Object.entries(STRIPE_PLANS)) {
      if (value.productId === subscriptionStatus.productId) {
        return key;
      }
    }
    return null;
  };

  const currentPlanId = getCurrentPlanId();

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
            
            {subscriptionStatus?.subscribed && (
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
            Selecione o plano ideal para suas necessidades
          </p>
          {subscriptionStatus?.subscribed && currentPlanId && (
            <div className="mt-4 inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
              <Crown className="h-4 w-4 text-primary" />
              <span className="text-sm">
                Plano atual: <span className="font-bold capitalize">
                  {plans.find(p => p.id === currentPlanId)?.name}
                </span>
                {subscriptionStatus.isTrialing && (
                  <span className="ml-2 text-amber-500">(Trial)</span>
                )}
              </span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground mt-4">Carregando...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => {
              const isCurrentPlan = currentPlanId === plan.id;
              
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card 
                    className={`glass p-8 border-border/50 relative overflow-hidden ${
                      isCurrentPlan 
                        ? "border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]" 
                        : plan.highlighted 
                          ? "border-primary shadow-glow" 
                          : "hover:border-primary/50"
                    } transition-all duration-300`}
                  >
                    {isCurrentPlan && (
                      <div className="absolute top-4 right-4">
                        <span className="bg-green-500 text-white text-xs px-3 py-1 rounded-full font-medium">
                          Seu plano
                        </span>
                      </div>
                    )}
                    {!isCurrentPlan && plan.highlighted && (
                      <div className="absolute top-4 right-4">
                        <span className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-medium">
                          Mais popular
                        </span>
                      </div>
                    )}
                    
                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                    
                    <div className="mb-6">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                      <p className="text-sm text-primary mt-2 font-medium">{plan.trial}</p>
                    </div>
                    
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button
                      className={`w-full ${
                        plan.highlighted && !isCurrentPlan
                          ? "bg-primary hover:bg-primary/90 shadow-glow" 
                          : ""
                      }`}
                      variant={plan.highlighted && !isCurrentPlan ? "default" : "outline"}
                      onClick={() => handleSelectPlan(plan.id)}
                      disabled={isCurrentPlan || checkoutLoading !== null}
                    >
                      {checkoutLoading === plan.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processando...
                        </>
                      ) : isCurrentPlan ? (
                        "Plano atual"
                      ) : (
                        "Selecionar"
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
