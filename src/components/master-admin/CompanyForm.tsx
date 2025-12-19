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

// Mapeamento dos planos com produtos Stripe
export const SUBSCRIPTION_PLANS = {
  free: {
    name: "Free",
    price_id: "price_1SackXIanwCICrsHO7wfG1WM",
    product_id: "prod_TXiAfvNuN13Bdj",
    description: "1 Credencial Power BI, 3 Dashboards, 5 Usuários",
    price: "R$ 1,00/mês",
  },
  professional: {
    name: "Profissional",
    price_id: "price_1SackmIanwCICrsHPUOabQqQ",
    product_id: "prod_TXiBsq6Urco479",
    description: "5 Credenciais Power BI, 20 Dashboards, 50 Usuários",
    price: "R$ 2,00/mês",
  },
  enterprise: {
    name: "Enterprise",
    price_id: "price_1Sacl7IanwCICrsHcwxFlClE",
    product_id: "prod_TXiB1hRL7kIi0Z",
    description: "Credenciais, Dashboards e Usuários ilimitados",
    price: "R$ 3,00/mês",
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
    plan: "free" as keyof typeof SUBSCRIPTION_PLANS,
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
