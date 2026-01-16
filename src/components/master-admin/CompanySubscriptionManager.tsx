import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CreditCard, Crown, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SUBSCRIPTION_PLANS } from "./CompanyForm";

interface Subscription {
  id: string;
  user_id: string;
  status: string;
  plan: string;
  is_master_managed: boolean;
  current_period_end: string | null;
}

interface CompanySubscriptionManagerProps {
  companyId: string;
  companyName: string;
}

export function CompanySubscriptionManager({ companyId, companyName }: CompanySubscriptionManagerProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [adminUser, setAdminUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<keyof typeof SUBSCRIPTION_PLANS>("starter");
  const [isMasterManaged, setIsMasterManaged] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, [companyId]);

  const fetchSubscription = async () => {
    setLoading(true);
    try {
      // Find admin user for this company
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("company_id", companyId);

      if (!profiles || profiles.length === 0) {
        setLoading(false);
        return;
      }

      // Find the admin among the profiles
      for (const profile of profiles) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", profile.id);

        if (roles?.some((r) => r.role === "admin")) {
          setAdminUser(profile);

          // Fetch subscription
          const { data: sub } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("user_id", profile.id)
            .maybeSingle();

          if (sub) {
            setSubscription(sub);
            // Map legacy plan keys to new ones
            const planKey = sub.plan === "free" || sub.plan === "essentials" ? "starter" : sub.plan;
            setSelectedPlan((planKey as keyof typeof SUBSCRIPTION_PLANS) || "starter");
            setIsMasterManaged(sub.is_master_managed || false);
          }
          break;
        }
      }
    } catch (error: any) {
      toast.error("Erro ao carregar assinatura");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSubscription = async () => {
    if (!adminUser) {
      toast.error("Nenhum administrador encontrado para esta empresa");
      return;
    }

    setUpdating(true);
    try {
      const plan = SUBSCRIPTION_PLANS[selectedPlan];
      
      const subscriptionData = {
        user_id: adminUser.id,
        status: "active",
        plan: selectedPlan,
        is_master_managed: isMasterManaged || !plan.price_id,
      };

      if (subscription) {
        const { error } = await supabase
          .from("subscriptions")
          .update(subscriptionData)
          .eq("id", subscription.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("subscriptions")
          .insert(subscriptionData);

        if (error) throw error;
      }

      toast.success("Assinatura atualizada com sucesso");
      fetchSubscription();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar assinatura");
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Ativo</Badge>;
      case "trial":
        return <Badge variant="secondary">Trial</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <p className="text-center py-8 text-muted-foreground">Carregando...</p>;
  }

  if (!adminUser) {
    return (
      <div className="text-center py-8 border rounded-lg">
        <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
        <p className="text-muted-foreground">
          Nenhum administrador encontrado para esta empresa.
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Adicione um usuário com função de Administrador primeiro.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Assinatura de {companyName}</h3>
        <p className="text-sm text-muted-foreground">
          Gerencie o plano de assinatura da empresa
        </p>
      </div>

      {/* Current Subscription Info */}
      {subscription && (
        <Card className="p-4 bg-card/80 backdrop-blur-md border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Crown className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">
                  Plano Atual: {SUBSCRIPTION_PLANS[subscription.plan as keyof typeof SUBSCRIPTION_PLANS]?.name || subscription.plan}
                </p>
                <p className="text-sm text-muted-foreground">
                  Admin: {adminUser.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(subscription.status)}
              {subscription.is_master_managed && (
                <Badge variant="outline" className="border-primary/50 text-primary">
                  Gerenciado
                </Badge>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Update Subscription Form */}
      <Card className="p-6 bg-card/80 backdrop-blur-md border-border/50 space-y-4">
        <h4 className="font-medium">Alterar Plano</h4>

        <div className="space-y-2">
          <Label>Plano de Assinatura</Label>
          <Select
            value={selectedPlan}
            onValueChange={(value: keyof typeof SUBSCRIPTION_PLANS) => {
              setSelectedPlan(value);
              if (value === "master_managed") {
                setIsMasterManaged(true);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{plan.name}</span>
                    <span className="text-muted-foreground">- {plan.price}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Plan Details */}
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm font-medium mb-2">
            {SUBSCRIPTION_PLANS[selectedPlan].name}
          </p>
          <p className="text-sm text-muted-foreground">
            {SUBSCRIPTION_PLANS[selectedPlan].description}
          </p>
          <p className="text-sm text-primary font-medium mt-2">
            {SUBSCRIPTION_PLANS[selectedPlan].price}
          </p>
        </div>

        {/* Master Managed Toggle */}
        {selectedPlan !== "master_managed" && (
          <div className="flex items-center justify-between border rounded-lg p-4">
            <div>
              <p className="font-medium">Gerenciado pelo Master Admin</p>
              <p className="text-sm text-muted-foreground">
                Desativa cobrança via Stripe. O pagamento será gerenciado manualmente.
              </p>
            </div>
            <Switch
              checked={isMasterManaged}
              onCheckedChange={setIsMasterManaged}
            />
          </div>
        )}

        <Button
          onClick={handleUpdateSubscription}
          disabled={updating}
          className="w-full"
        >
          {updating ? "Atualizando..." : "Salvar Alterações"}
        </Button>
      </Card>

      {/* Features by Plan */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => (
          <Card
            key={key}
            className={`p-4 ${
              selectedPlan === key
                ? "border-primary bg-primary/5"
                : "bg-card/80"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {selectedPlan === key && (
                <Check className="h-4 w-4 text-primary" />
              )}
              <p className="font-medium">{plan.name}</p>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {plan.description}
            </p>
            <p className="text-sm font-medium text-primary">{plan.price}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
