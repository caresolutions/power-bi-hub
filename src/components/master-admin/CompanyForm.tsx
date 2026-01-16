import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Mapeamento dos planos com produtos Stripe (deve corresponder aos plan_key da tabela subscription_plans)
export const SUBSCRIPTION_PLANS = {
  starter: {
    name: "Starter",
    price_id: "price_1ShDX5IanwCICrsHbCQUkwOL",
    product_id: "prod_TeWady6zqxrSAV",
    description: "1 Dashboard, 2 Usuários",
    price: "R$ 59,00/mês",
  },
  growth: {
    name: "Growth",
    price_id: "price_1ShDXIIanwCICrsHGtrVKrzj",
    product_id: "prod_TeWawmp8A9b1nk",
    description: "5 Dashboards, 10 Usuários",
    price: "R$ 149,00/mês",
  },
  scale: {
    name: "Scale",
    price_id: "price_1ShDXSIanwCICrsH4wlNhSpK",
    product_id: "prod_TeWatFycxkDxtn",
    description: "15 Dashboards, 25 Usuários",
    price: "R$ 249,00/mês",
  },
  enterprise: {
    name: "Enterprise",
    price_id: null,
    product_id: null,
    description: "Ilimitado, customizado",
    price: "Sob consulta",
  },
  master_managed: {
    name: "Gerenciado pelo Master",
    price_id: null,
    product_id: null,
    description: "Assinatura gerenciada manualmente sem Stripe",
    price: "Personalizado",
  },
};

interface CompanyFormProps {
  editingCompany?: {
    id: string;
    name: string;
    cnpj: string;
  } | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CompanyForm({ editingCompany, onSuccess, onCancel }: CompanyFormProps) {
  const [formData, setFormData] = useState({
    name: editingCompany?.name || "",
    cnpj: editingCompany?.cnpj || "",
    plan: "starter" as keyof typeof SUBSCRIPTION_PLANS,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.cnpj) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);

    try {
      if (editingCompany) {
        // Update company
        const { error } = await supabase
          .from("companies")
          .update({ name: formData.name, cnpj: formData.cnpj })
          .eq("id", editingCompany.id);

        if (error) throw error;
        toast.success("Empresa atualizada com sucesso");
      } else {
        // Create company
        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .insert({ name: formData.name, cnpj: formData.cnpj })
          .select()
          .single();

        if (companyError) {
          if (companyError.code === "23505") {
            toast.error("CNPJ já cadastrado");
          } else {
            throw companyError;
          }
          return;
        }

        // Create subscription for the company admin (will be assigned later)
        // The subscription is created when the first admin user is added to the company
        
        toast.success("Empresa criada com sucesso");
      }

      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar empresa");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome da Empresa *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Nome da empresa"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="cnpj">CNPJ *</Label>
        <Input
          id="cnpj"
          value={formData.cnpj}
          onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
          placeholder="00.000.000/0000-00"
        />
      </div>

      {!editingCompany && (
        <div className="space-y-2">
          <Label htmlFor="plan">Tipo de Assinatura</Label>
          <Select
            value={formData.plan}
            onValueChange={(value: keyof typeof SUBSCRIPTION_PLANS) =>
              setFormData({ ...formData, plan: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um plano" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex flex-col">
                    <span className="font-medium">{plan.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {plan.description} - {plan.price}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            A assinatura será atribuída quando um administrador for vinculado à empresa
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : editingCompany ? "Salvar" : "Criar Empresa"}
        </Button>
      </div>
    </form>
  );
}
