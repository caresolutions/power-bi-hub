import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, RefreshCw, Plus, Trash2, Infinity } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface SubscriptionPlan {
  id: string;
  plan_key: string;
  name: string;
  price_monthly: number;
  price_additional_user: number | null;
  trial_days: number;
  is_active: boolean;
  is_custom: boolean;
  display_order: number;
  description: string | null;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
}

interface PlanLimit {
  id: string;
  plan_id: string;
  limit_key: string;
  limit_value: number | null;
  is_unlimited: boolean;
}

interface PlanFeature {
  id: string;
  plan_id: string;
  feature_key: string;
  is_enabled: boolean;
  feature_description: string | null;
}

const LIMIT_LABELS: Record<string, string> = {
  dashboards: "Dashboards",
  users: "Usuários",
  credentials: "Credenciais",
};

const FEATURE_LABELS: Record<string, string> = {
  embed_publish: "Publicação Embed e Link Público",
  user_group_access: "Liberação por Usuário e Grupo",
  slider_tv: "Slider para Televisores",
  rls_email: "RLS a nível de E-mail",
  advanced_integrations: "Integrações Exclusivas",
  sla_support: "SLA de Suporte",
  custom_development: "Desenvolvimento Customizado",
};

export function PlansManager() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [limits, setLimits] = useState<Record<string, PlanLimit[]>>({});
  const [features, setFeatures] = useState<Record<string, PlanFeature[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>("");

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      
      const { data: plansData, error: plansError } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("display_order");

      if (plansError) throw plansError;

      const typedPlans = (plansData || []) as SubscriptionPlan[];
      setPlans(typedPlans);

      if (typedPlans.length > 0 && !selectedPlan) {
        setSelectedPlan(typedPlans[0].id);
      }

      // Fetch limits and features for all plans
      const limitsMap: Record<string, PlanLimit[]> = {};
      const featuresMap: Record<string, PlanFeature[]> = {};

      for (const plan of typedPlans) {
        const { data: limitsData } = await supabase
          .from("plan_limits")
          .select("*")
          .eq("plan_id", plan.id);

        limitsMap[plan.id] = (limitsData || []) as PlanLimit[];

        const { data: featuresData } = await supabase
          .from("plan_features")
          .select("*")
          .eq("plan_id", plan.id);

        featuresMap[plan.id] = (featuresData || []) as PlanFeature[];
      }

      setLimits(limitsMap);
      setFeatures(featuresMap);
    } catch (error) {
      console.error("Error fetching plans:", error);
      toast.error("Erro ao carregar planos");
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = (planId: string, field: keyof SubscriptionPlan, value: any) => {
    setPlans(prev => prev.map(p => 
      p.id === planId ? { ...p, [field]: value } : p
    ));
  };

  const handleLimitChange = (planId: string, limitKey: string, field: "limit_value" | "is_unlimited", value: any) => {
    setLimits(prev => ({
      ...prev,
      [planId]: prev[planId]?.map(l => 
        l.limit_key === limitKey ? { ...l, [field]: value } : l
      ) || [],
    }));
  };

  const handleFeatureChange = (planId: string, featureKey: string, isEnabled: boolean) => {
    setFeatures(prev => ({
      ...prev,
      [planId]: prev[planId]?.map(f => 
        f.feature_key === featureKey ? { ...f, is_enabled: isEnabled } : f
      ) || [],
    }));
  };

  const addNewLimit = async (planId: string) => {
    const newLimitKey = prompt("Digite a chave do novo limite (ex: reports, exports):");
    if (!newLimitKey) return;

    try {
      const { data, error } = await supabase
        .from("plan_limits")
        .insert({
          plan_id: planId,
          limit_key: newLimitKey,
          limit_value: 10,
          is_unlimited: false,
        })
        .select()
        .single();

      if (error) throw error;

      setLimits(prev => ({
        ...prev,
        [planId]: [...(prev[planId] || []), data as PlanLimit],
      }));

      toast.success("Limite adicionado");
    } catch (error) {
      console.error("Error adding limit:", error);
      toast.error("Erro ao adicionar limite");
    }
  };

  const addNewFeature = async (planId: string) => {
    const newFeatureKey = prompt("Digite a chave da nova funcionalidade (ex: custom_reports):");
    if (!newFeatureKey) return;

    const description = prompt("Digite a descrição da funcionalidade:");

    try {
      const { data, error } = await supabase
        .from("plan_features")
        .insert({
          plan_id: planId,
          feature_key: newFeatureKey,
          is_enabled: false,
          feature_description: description,
        })
        .select()
        .single();

      if (error) throw error;

      setFeatures(prev => ({
        ...prev,
        [planId]: [...(prev[planId] || []), data as PlanFeature],
      }));

      toast.success("Funcionalidade adicionada");
    } catch (error) {
      console.error("Error adding feature:", error);
      toast.error("Erro ao adicionar funcionalidade");
    }
  };

  const deleteLimit = async (planId: string, limitId: string) => {
    if (!confirm("Deseja realmente excluir este limite?")) return;

    try {
      const { error } = await supabase
        .from("plan_limits")
        .delete()
        .eq("id", limitId);

      if (error) throw error;

      setLimits(prev => ({
        ...prev,
        [planId]: prev[planId]?.filter(l => l.id !== limitId) || [],
      }));

      toast.success("Limite excluído");
    } catch (error) {
      console.error("Error deleting limit:", error);
      toast.error("Erro ao excluir limite");
    }
  };

  const deleteFeature = async (planId: string, featureId: string) => {
    if (!confirm("Deseja realmente excluir esta funcionalidade?")) return;

    try {
      const { error } = await supabase
        .from("plan_features")
        .delete()
        .eq("id", featureId);

      if (error) throw error;

      setFeatures(prev => ({
        ...prev,
        [planId]: prev[planId]?.filter(f => f.id !== featureId) || [],
      }));

      toast.success("Funcionalidade excluída");
    } catch (error) {
      console.error("Error deleting feature:", error);
      toast.error("Erro ao excluir funcionalidade");
    }
  };

  const saveAllChanges = async () => {
    try {
      setSaving(true);

      // Save plans
      for (const plan of plans) {
        const { error: planError } = await supabase
          .from("subscription_plans")
          .update({
            name: plan.name,
            price_monthly: plan.price_monthly,
            price_additional_user: plan.price_additional_user,
            trial_days: plan.trial_days,
            is_active: plan.is_active,
            is_custom: plan.is_custom,
            description: plan.description,
            stripe_price_id: plan.stripe_price_id,
            stripe_product_id: plan.stripe_product_id,
          })
          .eq("id", plan.id);

        if (planError) throw planError;

        // Save limits
        for (const limit of limits[plan.id] || []) {
          const { error: limitError } = await supabase
            .from("plan_limits")
            .update({
              limit_value: limit.is_unlimited ? null : limit.limit_value,
              is_unlimited: limit.is_unlimited,
            })
            .eq("id", limit.id);

          if (limitError) throw limitError;
        }

        // Save features
        for (const feature of features[plan.id] || []) {
          const { error: featureError } = await supabase
            .from("plan_features")
            .update({
              is_enabled: feature.is_enabled,
              feature_description: feature.feature_description,
            })
            .eq("id", feature.id);

          if (featureError) throw featureError;
        }
      }

      toast.success("Alterações salvas com sucesso!");
    } catch (error) {
      console.error("Error saving changes:", error);
      toast.error("Erro ao salvar alterações");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const currentPlan = plans.find(p => p.id === selectedPlan);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Configuração de Planos</h2>
          <p className="text-muted-foreground">Gerencie os planos de assinatura, limites e funcionalidades</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchPlans}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button onClick={saveAllChanges} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar Alterações
          </Button>
        </div>
      </div>

      <Tabs value={selectedPlan} onValueChange={setSelectedPlan}>
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${plans.length}, 1fr)` }}>
          {plans.map(plan => (
            <TabsTrigger key={plan.id} value={plan.id} className="flex items-center gap-2">
              {plan.name}
              {plan.is_custom && <Badge variant="secondary" className="text-xs">Custom</Badge>}
            </TabsTrigger>
          ))}
        </TabsList>

        {plans.map(plan => (
          <TabsContent key={plan.id} value={plan.id} className="space-y-6">
            {/* Plan Details */}
            <Card>
              <CardHeader>
                <CardTitle>Detalhes do Plano</CardTitle>
                <CardDescription>Informações básicas e preços</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do Plano</Label>
                    <Input
                      value={plan.name}
                      onChange={(e) => handlePlanChange(plan.id, "name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Chave do Plano</Label>
                    <Input value={plan.plan_key} disabled />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Preço Mensal (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={plan.price_monthly}
                      onChange={(e) => handlePlanChange(plan.id, "price_monthly", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Usuário Adicional (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={plan.price_additional_user || ""}
                      onChange={(e) => handlePlanChange(plan.id, "price_additional_user", e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="Não aplicável"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dias de Teste</Label>
                    <Input
                      type="number"
                      value={plan.trial_days}
                      onChange={(e) => handlePlanChange(plan.id, "trial_days", parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={plan.description || ""}
                    onChange={(e) => handlePlanChange(plan.id, "description", e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Stripe Price ID</Label>
                    <Input
                      value={plan.stripe_price_id || ""}
                      onChange={(e) => handlePlanChange(plan.id, "stripe_price_id", e.target.value || null)}
                      placeholder="price_..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Stripe Product ID</Label>
                    <Input
                      value={plan.stripe_product_id || ""}
                      onChange={(e) => handlePlanChange(plan.id, "stripe_product_id", e.target.value || null)}
                      placeholder="prod_..."
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={plan.is_active}
                      onCheckedChange={(checked) => handlePlanChange(plan.id, "is_active", checked)}
                    />
                    <Label>Plano Ativo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={plan.is_custom}
                      onCheckedChange={(checked) => handlePlanChange(plan.id, "is_custom", checked)}
                    />
                    <Label>Plano Personalizado (sob consulta)</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Plan Limits */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Limites do Plano</CardTitle>
                  <CardDescription>Configure os limites de recursos</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => addNewLimit(plan.id)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Limite
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(limits[plan.id] || []).map(limit => (
                    <div key={limit.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <Label className="text-sm font-medium">
                          {LIMIT_LABELS[limit.limit_key] || limit.limit_key}
                        </Label>
                        <p className="text-xs text-muted-foreground">{limit.limit_key}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={limit.is_unlimited}
                            onCheckedChange={(checked) => handleLimitChange(plan.id, limit.limit_key, "is_unlimited", checked)}
                          />
                          <Label className="flex items-center gap-1">
                            <Infinity className="h-4 w-4" />
                            Ilimitado
                          </Label>
                        </div>
                        {!limit.is_unlimited && (
                          <Input
                            type="number"
                            value={limit.limit_value || ""}
                            onChange={(e) => handleLimitChange(plan.id, limit.limit_key, "limit_value", parseInt(e.target.value) || 0)}
                            className="w-24"
                          />
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteLimit(plan.id, limit.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(limits[plan.id] || []).length === 0 && (
                    <p className="text-center text-muted-foreground py-4">Nenhum limite configurado</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Plan Features */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Funcionalidades do Plano</CardTitle>
                  <CardDescription>Habilite ou desabilite funcionalidades</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => addNewFeature(plan.id)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Funcionalidade
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(features[plan.id] || []).map(feature => (
                    <div key={feature.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <Label className="text-sm font-medium">
                          {FEATURE_LABELS[feature.feature_key] || feature.feature_description || feature.feature_key}
                        </Label>
                        <p className="text-xs text-muted-foreground">{feature.feature_key}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Switch
                          checked={feature.is_enabled}
                          onCheckedChange={(checked) => handleFeatureChange(plan.id, feature.feature_key, checked)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteFeature(plan.id, feature.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(features[plan.id] || []).length === 0 && (
                    <p className="text-center text-muted-foreground py-4">Nenhuma funcionalidade configurada</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
