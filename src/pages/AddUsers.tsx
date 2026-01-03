import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Users, Loader2, Check, Plus, Minus, CreditCard, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

interface PlanInfo {
  planKey: string;
  planName: string;
  pricePerUser: number;
  usersLimit: number;
  currentUsers: number;
  availableSlots: number;
  hasAdditionalUserPricing: boolean;
}

const AddUsers = () => {
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    checkAuthAndLoadData();
    
    // Handle success/cancel from Stripe
    if (searchParams.get("success") === "true") {
      const qty = searchParams.get("quantity") || "1";
      toast({
        title: "Usuários contratados!",
        description: `${qty} usuário(s) adicional(is) contratado(s) com sucesso.`,
      });
    } else if (searchParams.get("canceled") === "true") {
      toast({
        title: "Checkout cancelado",
        description: "O processo de checkout foi cancelado.",
        variant: "destructive",
      });
    }
  }, [searchParams]);

  const checkAuthAndLoadData = async () => {
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
      return;
    }

    await loadPlanInfo(user.id);
  };

  const loadPlanInfo = async (userId: string) => {
    try {
      // Get user's company
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", userId)
        .single();

      if (!profile?.company_id) {
        throw new Error("Empresa não encontrada");
      }

      // Get current users count
      const { count: currentUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("company_id", profile.company_id);

      // Get subscription info
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("plan")
        .eq("user_id", userId)
        .single();

      if (!subscription) {
        throw new Error("Assinatura não encontrada");
      }

      // Get plan details
      const { data: plan } = await supabase
        .from("subscription_plans")
        .select("id, plan_key, name, price_additional_user, stripe_additional_user_price_id")
        .eq("plan_key", subscription.plan)
        .single();

      // Get users limit for this plan
      const { data: planLimits } = await supabase
        .from("plan_limits")
        .select("limit_value, is_unlimited")
        .eq("plan_id", plan?.id || "")
        .eq("limit_key", "users")
        .single();

      const usersLimit = planLimits?.is_unlimited ? 999 : (planLimits?.limit_value || 0);

      setPlanInfo({
        planKey: plan?.plan_key || "",
        planName: plan?.name || "",
        pricePerUser: plan?.price_additional_user || 0,
        usersLimit: usersLimit,
        currentUsers: currentUsers || 0,
        availableSlots: Math.max(0, usersLimit - (currentUsers || 0)),
        hasAdditionalUserPricing: !!plan?.stripe_additional_user_price_id,
      });
    } catch (error: any) {
      console.error("Error loading plan info:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao carregar informações do plano.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (quantity < 1) return;
    
    setCheckoutLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-additional-user-checkout', {
        body: { quantity }
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
      setCheckoutLoading(false);
    }
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(price);
  };

  const totalPrice = (planInfo?.pricePerUser || 0) * quantity;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
              <div className="bg-primary/10 p-2 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">Contratar Usuários</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Current Status Card */}
            <Card className="glass border-border/50 mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Status Atual
                </CardTitle>
                <CardDescription>
                  Informações sobre o uso de usuários no seu plano
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {planInfo?.currentUsers}
                    </div>
                    <div className="text-sm text-muted-foreground">Usuários Atuais</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">
                      {planInfo?.usersLimit === 999 ? "∞" : planInfo?.usersLimit}
                    </div>
                    <div className="text-sm text-muted-foreground">Limite do Plano</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className={`text-2xl font-bold ${planInfo?.availableSlots === 0 ? 'text-destructive' : 'text-green-500'}`}>
                      {planInfo?.usersLimit === 999 ? "∞" : planInfo?.availableSlots}
                    </div>
                    <div className="text-sm text-muted-foreground">Vagas Disponíveis</div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <span className="text-sm font-medium">Seu Plano:</span>
                  <span className="font-bold text-primary">{planInfo?.planName}</span>
                </div>
              </CardContent>
            </Card>

            {/* Add Users Card */}
            {planInfo?.hasAdditionalUserPricing ? (
              <Card className="glass border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Contratar Usuários Adicionais
                  </CardTitle>
                  <CardDescription>
                    Adicione mais usuários à sua conta pagando por usuário adicional
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <span className="text-sm">Preço por usuário adicional:</span>
                    <span className="text-xl font-bold text-primary">
                      {formatPrice(planInfo?.pricePerUser || 0)}/mês
                    </span>
                  </div>

                  <div className="space-y-3">
                    <Label>Quantidade de usuários a contratar</Label>
                    <div className="flex items-center gap-4">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-24 text-center text-xl font-bold"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        {quantity} usuário(s) × {formatPrice(planInfo?.pricePerUser || 0)}
                      </span>
                      <span className="text-lg font-medium">{formatPrice(totalPrice)}/mês</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
                      <span className="font-bold">Total mensal:</span>
                      <span className="text-2xl font-bold text-primary">
                        {formatPrice(totalPrice)}
                      </span>
                    </div>
                  </div>

                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleCheckout}
                    disabled={checkoutLoading}
                  >
                    {checkoutLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-5 w-5" />
                        Contratar {quantity} Usuário(s)
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Ao contratar, você será redirecionado para o checkout seguro do Stripe.
                    A cobrança será mensal e proporcional ao período restante.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="glass border-border/50">
                <CardContent className="py-12">
                  <div className="text-center space-y-4">
                    <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
                    <h3 className="text-xl font-bold">Plano não suporta usuários adicionais</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Seu plano atual não permite a contratação de usuários adicionais.
                      Para adicionar mais usuários, considere fazer upgrade para um plano superior.
                    </p>
                    <Button onClick={() => navigate("/subscription")}>
                      Ver Planos Disponíveis
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default AddUsers;
