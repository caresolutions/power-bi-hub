import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, CreditCard, Check, Crown } from "lucide-react";
import { motion } from "framer-motion";

interface Subscription {
  id: string;
  status: string;
  plan: string;
  current_period_end: string | null;
}

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

const Subscription = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchSubscription();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    // Check if admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData?.role !== 'admin') {
      navigate("/home");
    }
  };

  const fetchSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setSubscription(data);
    } catch (error: any) {
      console.error("Error fetching subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (planId: string) => {
    toast({
      title: "Em breve",
      description: "A integração com pagamento será configurada em breve. Entre em contato para mais informações.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-hero opacity-30" />
      
      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-card/30 backdrop-blur">
        <div className="container mx-auto px-6 py-4">
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
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Escolha seu plano</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Selecione o plano ideal para suas necessidades
          </p>
          {subscription && (
            <div className="mt-4 inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
              <Crown className="h-4 w-4 text-primary" />
              <span className="text-sm">
                Plano atual: <span className="font-bold capitalize">{subscription.plan}</span>
              </span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className={`glass p-8 border-border/50 relative overflow-hidden ${
                    plan.highlighted 
                      ? "border-primary shadow-glow" 
                      : "hover:border-primary/50"
                  } transition-all duration-300`}
                >
                  {plan.highlighted && (
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
                      plan.highlighted 
                        ? "bg-primary hover:bg-primary/90 shadow-glow" 
                        : "variant-outline"
                    }`}
                    variant={plan.highlighted ? "default" : "outline"}
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={subscription?.plan === plan.id}
                  >
                    {subscription?.plan === plan.id ? "Plano atual" : "Selecionar"}
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Precisa de um plano personalizado?{" "}
            <a href="mailto:contato@exemplo.com" className="text-primary hover:underline">
              Entre em contato
            </a>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Subscription;
