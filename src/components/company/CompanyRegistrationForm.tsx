import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Building2, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { z } from "zod";

const cnpjSchema = z.string()
  .min(14, "CNPJ deve ter 14 dígitos")
  .max(18, "CNPJ inválido")
  .transform(val => val.replace(/\D/g, ''))
  .refine(val => val.length === 14, "CNPJ deve ter 14 dígitos");

const companySchema = z.object({
  cnpj: cnpjSchema,
  name: z.string().trim().min(2, "Nome da empresa deve ter no mínimo 2 caracteres").max(200, "Nome muito longo"),
});

interface CompanyRegistrationFormProps {
  onSuccess: () => void;
}

const CompanyRegistrationForm = ({ onSuccess }: CompanyRegistrationFormProps) => {
  const [cnpj, setCnpj] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 14) {
      return numbers
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return value.slice(0, 18);
  };

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setCnpj(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = companySchema.safeParse({ cnpj, name: companyName });
    
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Check if CNPJ already exists
      const { data: existingCompany } = await supabase
        .from("companies")
        .select("id")
        .eq("cnpj", result.data.cnpj)
        .maybeSingle();

      if (existingCompany) {
        setErrors({ cnpj: "CNPJ já cadastrado no sistema" });
        setLoading(false);
        return;
      }

      // Create company
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .insert({
          cnpj: result.data.cnpj,
          name: result.data.name,
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // Update user profile with company_id
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ company_id: company.id })
        .eq("id", user.id);

      if (profileError) throw profileError;

      toast.success("Empresa cadastrada com sucesso!", {
        duration: 3000,
      });

      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto"
    >
      <Card className="bg-card/80 backdrop-blur-md p-8 border-border/50">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-primary/10 p-4 rounded-xl">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Cadastro da Empresa</h2>
            <p className="text-muted-foreground text-sm">
              Informe os dados da sua empresa para continuar
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="cnpj" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              CNPJ
            </Label>
            <Input
              id="cnpj"
              type="text"
              value={cnpj}
              onChange={handleCNPJChange}
              placeholder="00.000.000/0000-00"
              className={`bg-background/50 ${errors.cnpj ? 'border-destructive' : ''}`}
            />
            {errors.cnpj && (
              <p className="text-sm text-destructive">{errors.cnpj}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyName" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Nome da Empresa
            </Label>
            <Input
              id="companyName"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Nome da sua empresa"
              className={`bg-background/50 ${errors.name ? 'border-destructive' : ''}`}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 shadow-glow"
            disabled={loading}
          >
            {loading ? "Cadastrando..." : "Cadastrar Empresa"}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
          <p className="text-sm text-primary">
            <strong>Nota:</strong> Esses dados serão usados para identificar sua empresa no sistema.
          </p>
        </div>
      </Card>
    </motion.div>
  );
};

export default CompanyRegistrationForm;
