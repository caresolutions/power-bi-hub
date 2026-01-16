import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  Building2,
  Share2
} from "lucide-react";
import { motion } from "framer-motion";
import CredentialForm from "@/components/credentials/CredentialForm";
import { CredentialCompanyAccessDialog } from "@/components/credentials/CredentialCompanyAccessDialog";
import { CompanyFilter } from "@/components/CompanyFilter";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscriptionPlan } from "@/hooks/useSubscriptionPlan";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import LanguageSelector from "@/components/LanguageSelector";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  accessCount?: number;
}

const Credentials = () => {
  const { t } = useTranslation();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [accessDialogCredential, setAccessDialogCredential] = useState<Credential | null>(null);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { userId, isMasterAdmin, isAdmin, loading: roleLoading, companyId } = useUserRole();
  const { checkLimit, currentPlan, refetch: refetchPlan } = useSubscriptionPlan();
  
  const credentialLimit = checkLimit("credentials");

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

      if (!isMasterAdmin && companyId) {
        const { data: accessData } = await supabase
          .from("credential_company_access")
          .select("credential_id")
          .eq("company_id", companyId);
        
        const releasedCredentialIds = accessData?.map(a => a.credential_id) || [];
        
        query = query.or(`company_id.eq.${companyId}${releasedCredentialIds.length > 0 ? `,id.in.(${releasedCredentialIds.join(",")})` : ""}`);
      } else if (isMasterAdmin && selectedCompanyId !== "all") {
        query = query.or(`company_id.is.null,company_id.eq.${selectedCompanyId}`);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (isMasterAdmin && data) {
        const companyIds = [...new Set(data.map(c => c.company_id).filter(Boolean))];
        const globalCredentialIds = data.filter(c => !c.company_id).map(c => c.id);
        
        let companyMap = new Map<string, string>();
        if (companyIds.length > 0) {
          const { data: companies } = await supabase
            .from("companies")
            .select("id, name")
            .in("id", companyIds);
          companyMap = new Map(companies?.map(c => [c.id, c.name]) || []);
        }
        
        let accessCountMap = new Map<string, number>();
        if (globalCredentialIds.length > 0) {
          const { data: accessCounts } = await supabase
            .from("credential_company_access")
            .select("credential_id")
            .in("credential_id", globalCredentialIds);
          
          accessCounts?.forEach(a => {
            accessCountMap.set(a.credential_id, (accessCountMap.get(a.credential_id) || 0) + 1);
          });
        }
        
        const credentialsWithData = data.map(cred => ({
          ...cred,
          company: cred.company_id ? { name: companyMap.get(cred.company_id) || t('dashboards.unknown') } : undefined,
          accessCount: accessCountMap.get(cred.id) || 0
        }));
        
        setCredentials(credentialsWithData);
      } else {
        setCredentials(data || []);
      }
    } catch (error: any) {
      toast({
        title: t('common.error'),
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
        title: t('common.success'),
        description: t('credentials.removed'),
      });
      
      fetchCredentials();
    } catch (error: any) {
      toast({
        title: t('common.error'),
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
    refetchPlan();
  };

  const handleNewCredential = () => {
    if (!credentialLimit.allowed && !credentialLimit.isUnlimited) {
      toast({
        title: t('credentials.limitReached'),
        description: t('credentials.limitReachedDesc', { limit: credentialLimit.limit, plan: currentPlan?.name || "atual" }),
        variant: "destructive",
      });
      return;
    }
    setShowForm(true);
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t('common.loading')}</p>
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
                {t('common.back')}
              </Button>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Settings className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-2xl font-bold">{t('credentials.environmentConfig')}</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <LanguageSelector />
              {!showForm && (
                <Button
                  onClick={handleNewCredential}
                  className="bg-primary hover:bg-primary/90 shadow-glow"
                  disabled={!credentialLimit.allowed && !credentialLimit.isUnlimited}
                >
                  <Plus className="mr-2 h-5 w-5" />
                  {t('credentials.newCredential')}
                  {!credentialLimit.isUnlimited && (
                    <Badge variant="secondary" className="ml-2">
                      {credentialLimit.current}/{credentialLimit.limit}
                    </Badge>
                  )}
                </Button>
              )}
            </div>
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
                <h2 className="text-3xl font-bold mb-2">{t('credentials.powerBiCredentials')}</h2>
                <p className="text-muted-foreground">
                  {isMasterAdmin 
                    ? t('credentials.manageAllCompanies')
                    : t('credentials.manageYour')}
                </p>
              </div>
              
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
                <p className="text-muted-foreground">{t('common.loading')}</p>
              </div>
            ) : credentials.length === 0 ? (
              <Card className="glass p-12 text-center border-border/50">
                <Key className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-2xl font-bold mb-2">{t('credentials.noCredentials')}</h3>
                <p className="text-muted-foreground mb-6">
                  {isMasterAdmin && selectedCompanyId !== "all"
                    ? t('credentials.noCompanyCredentials')
                    : t('credentials.addYourCredentials')}
                </p>
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-primary hover:bg-primary/90 shadow-glow"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  {t('credentials.addCredential')}
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
                        <div className="flex gap-1">
                          {isMasterAdmin && !credential.company_id && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setAccessDialogCredential(credential)}
                                  >
                                    <Share2 className="h-4 w-4 text-primary" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t('credentials.releaseToCompanies')} ({credential.accessCount || 0})</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
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
                      
                      {isMasterAdmin && (
                        <Badge 
                          variant={credential.company_id ? "outline" : "default"} 
                          className={`mb-3 flex items-center gap-1 w-fit ${!credential.company_id ? "bg-accent text-accent-foreground" : ""}`}
                        >
                          {credential.company_id ? (
                            <>
                              <Building2 className="h-3 w-3" />
                              {credential.company?.name || t('dashboards.unknown')}
                            </>
                          ) : (
                            <>🌐 {t('credentials.global')}</>
                          )}
                        </Badge>
                      )}
                      
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p className="truncate font-mono">{t('credentials.clientId')}: {credential.client_id.slice(0, 8)}...</p>
                        <p className="truncate font-mono">{t('credentials.tenantId')}: {credential.tenant_id.slice(0, 8)}...</p>
                        {credential.username && (
                          <p className="truncate">{t('credentials.login')}: {credential.username}</p>
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
            <AlertDialogTitle>{t('credentials.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('credentials.deleteWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {accessDialogCredential && (
        <CredentialCompanyAccessDialog
          open={!!accessDialogCredential}
          onOpenChange={(open) => {
            if (!open) {
              setAccessDialogCredential(null);
              fetchCredentials();
            }
          }}
          credentialId={accessDialogCredential.id}
          credentialName={accessDialogCredential.name}
        />
      )}
    </div>
  );
};

const CredentialsWithGuard = () => {
  const { t } = useTranslation();
  const { isMasterAdmin, loading } = useUserRole();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (isMasterAdmin) {
    return <Credentials />;
  }

  return (
    <SubscriptionGuard>
      <Credentials />
    </SubscriptionGuard>
  );
};

export default CredentialsWithGuard;
