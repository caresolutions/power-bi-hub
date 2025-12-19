import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { 
  ArrowLeft, 
  Plus, 
  Settings, 
  Pencil, 
  Trash2,
  Key,
  Building2
} from "lucide-react";
import { motion } from "framer-motion";
import CredentialForm from "@/components/credentials/CredentialForm";
import { CompanyFilter } from "@/components/CompanyFilter";
import { useUserRole } from "@/hooks/useUserRole";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Credential {
  id: string;
  name: string;
  client_id: string;
  tenant_id: string;
  username?: string;
  created_at: string;
  company_id: string | null;
  company?: {
    name: string;
  };
}

const Credentials = () => {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { userId, isMasterAdmin, isAdmin, loading: roleLoading, companyId } = useUserRole();

  useEffect(() => {
    if (!roleLoading && userId) {
      if (!isAdmin) {
        navigate("/home");
        return;
      }
      fetchCredentials();
    } else if (!roleLoading && !userId) {
      navigate("/auth");
    }
  }, [roleLoading, userId, isAdmin, selectedCompanyId]);

  const fetchCredentials = async () => {
    try {
      let query = supabase
        .from("power_bi_configs")
        .select("id, name, client_id, tenant_id, username, created_at, company_id")
        .order("created_at", { ascending: false });

      // Filter by company for non-master admins
      if (!isMasterAdmin && companyId) {
        query = query.eq("company_id", companyId);
      } else if (isMasterAdmin && selectedCompanyId !== "all") {
        query = query.eq("company_id", selectedCompanyId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch company names for master admin view
      if (isMasterAdmin && data) {
        const companyIds = [...new Set(data.map(c => c.company_id).filter(Boolean))];
        if (companyIds.length > 0) {
          const { data: companies } = await supabase
            .from("companies")
            .select("id, name")
            .in("id", companyIds);

          const companyMap = new Map(companies?.map(c => [c.id, c.name]) || []);
          
          const credentialsWithCompany = data.map(cred => ({
            ...cred,
            company: cred.company_id ? { name: companyMap.get(cred.company_id) || "Desconhecida" } : undefined
          }));
          
          setCredentials(credentialsWithCompany);
        } else {
          setCredentials(data || []);
        }
      } else {
        setCredentials(data || []);
      }
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

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      const { error } = await supabase
        .from("power_bi_configs")
        .delete()
        .eq("id", deletingId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Credencial removida com sucesso",
      });
      
      fetchCredentials();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingCredential(null);
    fetchCredentials();
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-hero opacity-30" />
      
      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-card/30 backdrop-blur">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate("/home")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Settings className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-2xl font-bold">Configuração de Ambiente</h1>
              </div>
            </div>
            
            {!showForm && (
              <Button
                onClick={() => setShowForm(true)}
                className="bg-primary hover:bg-primary/90 shadow-glow"
              >
                <Plus className="mr-2 h-5 w-5" />
                Nova Credencial
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 py-12">
        {showForm || editingCredential ? (
          <CredentialForm 
            credential={editingCredential}
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setShowForm(false);
              setEditingCredential(null);
            }}
            isMasterAdmin={isMasterAdmin}
            defaultCompanyId={isMasterAdmin ? (selectedCompanyId !== "all" ? selectedCompanyId : undefined) : companyId || undefined}
          />
        ) : (
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-3xl font-bold mb-2">Credenciais do Power BI</h2>
                <p className="text-muted-foreground">
                  {isMasterAdmin 
                    ? "Gerencie credenciais de todas as empresas"
                    : "Gerencie suas credenciais de acesso ao Microsoft Power BI"}
                </p>
              </div>
              
              {/* Company Filter for Master Admin */}
              {isMasterAdmin && (
                <CompanyFilter
                  value={selectedCompanyId}
                  onChange={(value) => {
                    setSelectedCompanyId(value);
                    setLoading(true);
                  }}
                />
              )}
            </div>

            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            ) : credentials.length === 0 ? (
              <Card className="glass p-12 text-center border-border/50">
                <Key className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-2xl font-bold mb-2">Nenhuma credencial cadastrada</h3>
                <p className="text-muted-foreground mb-6">
                  {isMasterAdmin && selectedCompanyId !== "all"
                    ? "Esta empresa não possui credenciais cadastradas"
                    : "Adicione suas credenciais do Power BI para começar"}
                </p>
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-primary hover:bg-primary/90 shadow-glow"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Adicionar Credencial
                </Button>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {credentials.map((credential, index) => (
                  <motion.div
                    key={credential.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="glass p-6 border-border/50 hover:border-primary/50 transition-all duration-300">
                      <div className="flex items-start justify-between mb-4">
                        <div className="bg-primary/10 p-3 rounded-lg">
                          <Key className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingCredential(credential)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingId(credential.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      
                      <h3 className="text-xl font-bold mb-3">{credential.name}</h3>
                      
                      {/* Company badge for Master Admin */}
                      {isMasterAdmin && credential.company && (
                        <Badge variant="outline" className="mb-3 flex items-center gap-1 w-fit">
                          <Building2 className="h-3 w-3" />
                          {credential.company.name}
                        </Badge>
                      )}
                      
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p className="truncate font-mono">Client ID: {credential.client_id.slice(0, 8)}...</p>
                        <p className="truncate font-mono">Tenant ID: {credential.tenant_id.slice(0, 8)}...</p>
                        {credential.username && (
                          <p className="truncate">Login: {credential.username}</p>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta credencial? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Credentials;
