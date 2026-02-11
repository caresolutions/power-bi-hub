import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Settings2, Users, LayoutDashboard, KeyRound, Sparkles, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface LimitConfig {
  limit_key: string;
  limit_value: number | null;
  is_unlimited: boolean;
  label: string;
  icon: React.ReactNode;
  defaultValue: number | null;
  defaultUnlimited: boolean;
}

interface FeatureConfig {
  feature_key: string;
  is_enabled: boolean;
  feature_description: string;
  defaultEnabled: boolean;
}

interface CompanyPlanCustomizerProps {
  companyId: string;
  companyName: string;
  planKey: string;
}

const LIMIT_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  users: { label: "Usuários", icon: <Users className="h-4 w-4" /> },
  dashboards: { label: "Dashboards", icon: <LayoutDashboard className="h-4 w-4" /> },
  credentials: { label: "Credenciais", icon: <KeyRound className="h-4 w-4" /> },
};

export function CompanyPlanCustomizer({ companyId, companyName, planKey }: CompanyPlanCustomizerProps) {
  const [limits, setLimits] = useState<LimitConfig[]>([]);
  const [features, setFeatures] = useState<FeatureConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [companyId, planKey]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get plan defaults
      const { data: plan } = await supabase
        .from("subscription_plans")
        .select("id")
        .eq("plan_key", planKey)
        .maybeSingle();

      let defaultLimits: Record<string, { value: number | null; unlimited: boolean }> = {};
      let defaultFeatures: Record<string, { enabled: boolean; description: string }> = {};

      if (plan) {
        const { data: planLimits } = await supabase
          .from("plan_limits")
          .select("*")
          .eq("plan_id", plan.id);

        (planLimits || []).forEach((l) => {
          defaultLimits[l.limit_key] = { value: l.limit_value, unlimited: l.is_unlimited };
        });

        const { data: planFeatures } = await supabase
          .from("plan_features")
          .select("*")
          .eq("plan_id", plan.id);

        (planFeatures || []).forEach((f) => {
          defaultFeatures[f.feature_key] = {
            enabled: f.is_enabled,
            description: f.feature_description || "",
          };
        });
      }

      // Get company overrides
      const { data: customLimits } = await supabase
        .from("company_custom_limits")
        .select("*")
        .eq("company_id", companyId);

      const { data: customFeatures } = await supabase
        .from("company_custom_features")
        .select("*")
        .eq("company_id", companyId);

      const customLimitsMap: Record<string, { value: number | null; unlimited: boolean }> = {};
      (customLimits || []).forEach((cl: any) => {
        customLimitsMap[cl.limit_key] = { value: cl.limit_value, unlimited: cl.is_unlimited };
      });

      const customFeaturesMap: Record<string, boolean> = {};
      (customFeatures || []).forEach((cf: any) => {
        customFeaturesMap[cf.feature_key] = cf.is_enabled;
      });

      // Build limits list
      const limitKeys = ["users", "dashboards", "credentials"];
      const builtLimits: LimitConfig[] = limitKeys.map((key) => {
        const def = defaultLimits[key] || { value: null, unlimited: true };
        const custom = customLimitsMap[key];
        const meta = LIMIT_LABELS[key] || { label: key, icon: <Settings2 className="h-4 w-4" /> };
        return {
          limit_key: key,
          limit_value: custom ? custom.value : def.value,
          is_unlimited: custom ? custom.unlimited : def.unlimited,
          label: meta.label,
          icon: meta.icon,
          defaultValue: def.value,
          defaultUnlimited: def.unlimited,
        };
      });

      // Build features list
      const allFeatureKeys = Object.keys(defaultFeatures);
      const builtFeatures: FeatureConfig[] = allFeatureKeys.map((key) => {
        const def = defaultFeatures[key];
        return {
          feature_key: key,
          is_enabled: customFeaturesMap[key] !== undefined ? customFeaturesMap[key] : def.enabled,
          feature_description: def.description,
          defaultEnabled: def.enabled,
        };
      });

      setLimits(builtLimits);
      setFeatures(builtFeatures);
    } catch (error) {
      console.error("Error fetching plan customization:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upsert custom limits
      for (const limit of limits) {
        const isDifferentFromDefault =
          limit.is_unlimited !== limit.defaultUnlimited ||
          limit.limit_value !== limit.defaultValue;

        if (isDifferentFromDefault) {
          const { error } = await supabase
            .from("company_custom_limits")
            .upsert(
              {
                company_id: companyId,
                limit_key: limit.limit_key,
                limit_value: limit.is_unlimited ? null : limit.limit_value,
                is_unlimited: limit.is_unlimited,
              },
              { onConflict: "company_id,limit_key" }
            );
          if (error) throw error;
        } else {
          // Remove override if back to default
          await supabase
            .from("company_custom_limits")
            .delete()
            .eq("company_id", companyId)
            .eq("limit_key", limit.limit_key);
        }
      }

      // Upsert custom features
      for (const feature of features) {
        const isDifferent = feature.is_enabled !== feature.defaultEnabled;

        if (isDifferent) {
          const { error } = await supabase
            .from("company_custom_features")
            .upsert(
              {
                company_id: companyId,
                feature_key: feature.feature_key,
                is_enabled: feature.is_enabled,
                feature_description: feature.feature_description,
              },
              { onConflict: "company_id,feature_key" }
            );
          if (error) throw error;
        } else {
          await supabase
            .from("company_custom_features")
            .delete()
            .eq("company_id", companyId)
            .eq("feature_key", feature.feature_key);
        }
      }

      toast.success("Configurações personalizadas salvas com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-center py-4 text-muted-foreground">Carregando configurações...</p>;
  }

  return (
    <Card className="p-6 bg-card/80 backdrop-blur-md border-border/50 space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-lg">
          <Settings2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h4 className="font-semibold">Configuração Personalizada</h4>
          <p className="text-sm text-muted-foreground">
            Defina limites e funcionalidades específicos para {companyName}
          </p>
        </div>
      </div>

      {/* Limits */}
      <div className="space-y-4">
        <h5 className="text-sm font-medium flex items-center gap-2">
          Limites de Uso
          <Badge variant="outline" className="text-xs">Personalizado</Badge>
        </h5>

        {limits.map((limit, idx) => (
          <div key={limit.limit_key} className="flex items-center gap-4 p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2 min-w-[140px]">
              {limit.icon}
              <span className="text-sm font-medium">{limit.label}</span>
            </div>

            <div className="flex items-center gap-3 flex-1">
              <div className="flex items-center gap-2">
                <Switch
                  checked={limit.is_unlimited}
                  onCheckedChange={(checked) => {
                    const updated = [...limits];
                    updated[idx] = { ...limit, is_unlimited: checked };
                    setLimits(updated);
                  }}
                />
                <span className="text-xs text-muted-foreground">Ilimitado</span>
              </div>

              {!limit.is_unlimited && (
                <Input
                  type="number"
                  min={0}
                  value={limit.limit_value ?? ""}
                  onChange={(e) => {
                    const updated = [...limits];
                    updated[idx] = {
                      ...limit,
                      limit_value: e.target.value ? parseInt(e.target.value) : null,
                    };
                    setLimits(updated);
                  }}
                  className="w-24 h-8"
                  placeholder="Qtd"
                />
              )}

              {(limit.is_unlimited !== limit.defaultUnlimited ||
                limit.limit_value !== limit.defaultValue) && (
                <Badge variant="secondary" className="text-xs">
                  Customizado
                </Badge>
              )}
            </div>

            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Padrão: {limit.defaultUnlimited ? "Ilimitado" : limit.defaultValue ?? 0}
            </span>
          </div>
        ))}
      </div>

      <Separator />

      {/* Features */}
      <div className="space-y-4">
        <h5 className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Funcionalidades
        </h5>

        <div className="grid gap-3">
          {features.map((feature, idx) => (
            <div
              key={feature.feature_key}
              className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{feature.feature_description || feature.feature_key}</span>
                  {feature.is_enabled !== feature.defaultEnabled && (
                    <Badge variant="secondary" className="text-xs">Customizado</Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  Padrão: {feature.defaultEnabled ? "Habilitado" : "Desabilitado"}
                </span>
              </div>
              <Switch
                checked={feature.is_enabled}
                onCheckedChange={(checked) => {
                  const updated = [...features];
                  updated[idx] = { ...feature, is_enabled: checked };
                  setFeatures(updated);
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        <Save className="mr-2 h-4 w-4" />
        {saving ? "Salvando..." : "Salvar Configurações Personalizadas"}
      </Button>
    </Card>
  );
}
