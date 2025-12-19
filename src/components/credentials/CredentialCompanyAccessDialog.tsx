import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { Building2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Company {
  id: string;
  name: string;
}

interface CredentialCompanyAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credentialId: string;
  credentialName: string;
}

export const CredentialCompanyAccessDialog = ({
  open,
  onOpenChange,
  credentialId,
  credentialName,
}: CredentialCompanyAccessDialogProps) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, credentialId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all companies
      const { data: companiesData, error: companiesError } = await supabase
        .from("companies")
        .select("id, name")
        .order("name");

      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);

      // Fetch existing access for this credential
      const { data: accessData, error: accessError } = await supabase
        .from("credential_company_access")
        .select("company_id")
        .eq("credential_id", credentialId);

      if (accessError) throw accessError;

      const accessSet = new Set(accessData?.map((a) => a.company_id) || []);
      setSelectedCompanies(accessSet);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleCompany = (companyId: string) => {
    const newSet = new Set(selectedCompanies);
    if (newSet.has(companyId)) {
      newSet.delete(companyId);
    } else {
      newSet.add(companyId);
    }
    setSelectedCompanies(newSet);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Get current access
      const { data: currentAccess, error: fetchError } = await supabase
        .from("credential_company_access")
        .select("company_id")
        .eq("credential_id", credentialId);

      if (fetchError) throw fetchError;

      const currentSet = new Set(currentAccess?.map((a) => a.company_id) || []);

      // Determine additions and removals
      const toAdd = [...selectedCompanies].filter((id) => !currentSet.has(id));
      const toRemove = [...currentSet].filter((id) => !selectedCompanies.has(id));

      // Remove access
      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from("credential_company_access")
          .delete()
          .eq("credential_id", credentialId)
          .in("company_id", toRemove);

        if (deleteError) throw deleteError;
      }

      // Add access
      if (toAdd.length > 0) {
        const insertData = toAdd.map((companyId) => ({
          credential_id: credentialId,
          company_id: companyId,
          granted_by: user.id,
        }));

        const { error: insertError } = await supabase
          .from("credential_company_access")
          .insert(insertData);

        if (insertError) throw insertError;
      }

      toast({
        title: "Sucesso",
        description: "Acesso às empresas atualizado",
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Liberar Credencial para Empresas
          </DialogTitle>
          <DialogDescription>
            Selecione quais empresas podem usar a credencial "{credentialName}"
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : companies.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhuma empresa cadastrada
          </p>
        ) : (
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {companies.map((company) => (
              <div
                key={company.id}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer"
                onClick={() => toggleCompany(company.id)}
              >
                <Checkbox
                  checked={selectedCompanies.has(company.id)}
                  onCheckedChange={() => toggleCompany(company.id)}
                />
                <span className="flex-1">{company.name}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex-1"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
