import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Building2, Save } from "lucide-react";

interface Company {
  id: string;
  name: string;
  cnpj: string;
}

export const CompanySettings = () => {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: "", cnpj: "" });
  const { toast } = useToast();

  useEffect(() => {
    fetchCompany();
  }, []);

  const fetchCompany = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (profile?.company_id) {
      const { data: companyData } = await supabase
        .from("companies")
        .select("*")
        .eq("id", profile.company_id)
        .single();

      if (companyData) {
        setCompany(companyData);
        setFormData({ name: companyData.name, cnpj: companyData.cnpj });
      }
    }
    setLoading(false);
  };

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .slice(0, 18);
  };

  const handleSave = async () => {
    if (!company) return;
    
    setSaving(true);
    const { error } = await supabase
      .from("companies")
      .update({ name: formData.name, cnpj: formData.cnpj.replace(/\D/g, "") })
      .eq("id", company.id);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Dados da empresa atualizados com sucesso",
      });
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="text-muted-foreground">Carregando...</div>;
  }

  if (!company) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Nenhuma empresa cadastrada.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <CardTitle>Dados da Empresa</CardTitle>
        </div>
        <CardDescription>
          Gerencie as informações cadastrais da sua empresa
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="company-name">Nome da Empresa</Label>
          <Input
            id="company-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Nome da empresa"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="cnpj">CNPJ</Label>
          <Input
            id="cnpj"
            value={formatCNPJ(formData.cnpj)}
            onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
            placeholder="00.000.000/0000-00"
            maxLength={18}
          />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </CardContent>
    </Card>
  );
};
