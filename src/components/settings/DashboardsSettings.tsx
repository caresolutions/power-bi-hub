import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, Save } from "lucide-react";

interface DashboardsSettingsProps {
  companyId?: string | null;
}

export const DashboardsSettings = ({ companyId }: DashboardsSettingsProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fitMode, setFitMode] = useState<"width" | "page">("width");
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (companyId) {
        const { data } = await supabase
          .from("companies")
          .select("default_fit_mode")
          .eq("id", companyId)
          .maybeSingle();
        if (data?.default_fit_mode === "page" || data?.default_fit_mode === "width") {
          setFitMode(data.default_fit_mode);
        }
      }
      setLoading(false);
    };
    load();
  }, [companyId]);

  const handleSave = async () => {
    if (!companyId) return;
    setSaving(true);
    const { error } = await supabase
      .from("companies")
      .update({ default_fit_mode: fitMode })
      .eq("id", companyId);
    setSaving(false);

    toast({
      title: error ? "Erro" : "Sucesso",
      description: error
        ? "Não foi possível salvar a configuração."
        : "Padrão de exibição da empresa atualizado.",
      variant: error ? "destructive" : undefined,
    });
  };

  if (loading) {
    return <div className="text-muted-foreground">Carregando...</div>;
  }

  if (!companyId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Selecione uma empresa para configurar.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-primary" />
          <CardTitle>Exibição dos dashboards</CardTitle>
        </div>
        <CardDescription>
          Defina como os dashboards abrem por padrão para todos da empresa. Se a pessoa mudar a
          opção na tela do dashboard, a escolha dela passa a valer só para ela.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Padrão da empresa</Label>
          <RadioGroup value={fitMode} onValueChange={(v) => setFitMode(v as "width" | "page")}>
            <div className="flex items-start gap-3">
              <RadioGroupItem value="width" id="fit-width" className="mt-1" />
              <Label htmlFor="fit-width" className="font-normal cursor-pointer">
                Ajustar largura
                <span className="block text-sm text-muted-foreground">
                  Ocupa toda a largura, com rolagem vertical quando necessário.
                </span>
              </Label>
            </div>
            <div className="flex items-start gap-3">
              <RadioGroupItem value="page" id="fit-page" className="mt-1" />
              <Label htmlFor="fit-page" className="font-normal cursor-pointer">
                Ajustar à tela
                <span className="block text-sm text-muted-foreground">
                  Mostra o dashboard inteiro, sem rolagem.
                </span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </CardContent>
    </Card>
  );
};
