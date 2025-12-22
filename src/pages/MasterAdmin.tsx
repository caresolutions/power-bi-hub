import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Building2, 
  Plus, 
  Edit2, 
  Trash2, 
  Users,
  LayoutDashboard,
  Shield,
  Settings,
  CreditCard,
  FolderOpen,
  FileText
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CompanyForm } from "@/components/master-admin/CompanyForm";
import { CompanyUsersManager } from "@/components/master-admin/CompanyUsersManager";
import { CompanyDashboardsManager } from "@/components/master-admin/CompanyDashboardsManager";
import { CompanyGroupsManager } from "@/components/master-admin/CompanyGroupsManager";
import { CompanySubscriptionManager } from "@/components/master-admin/CompanySubscriptionManager";
import { SubscriptionsManager } from "@/components/master-admin/SubscriptionsManager";
import { LegalTermsEditor } from "@/components/settings/LegalTermsEditor";
import { PlansManager } from "@/components/master-admin/PlansManager";

interface Company {
  id: string;
  name: string;
  cnpj: string;
  created_at: string;
  _count?: {
    users: number;
    dashboards: number;
  };
}

const MasterAdmin = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    // Check if user has master_admin role (user may have multiple roles)
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const roles = rolesData?.map(r => r.role) || [];
    
    if (!roles.includes("master_admin")) {
      toast.error("Acesso negado. Apenas Master Admin pode acessar esta página.");
      navigate("/home");
      return;
    }

    fetchCompanies();
  };

  const fetchCompanies = async () => {
    setLoading(true);
    
    // Fetch companies
    const { data: companiesData, error } = await supabase
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar empresas");
      setLoading(false);
      return;
    }

    // Fetch counts for each company
    const companiesWithCounts = await Promise.all(
      (companiesData || []).map(async (company) => {
        const { count: usersCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("company_id", company.id);

        const { count: dashboardsCount } = await supabase
          .from("dashboards")
          .select("*", { count: "exact", head: true })
          .eq("company_id", company.id);

        return {
          ...company,
          _count: {
            users: usersCount || 0,
            dashboards: dashboardsCount || 0,
          },
        };
      })
    );

    setCompanies(companiesWithCounts);
    setLoading(false);
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase
      .from("companies")
      .delete()
      .eq("id", deleteId);

    if (error) {
      toast.error("Erro ao excluir empresa. Verifique se não há usuários ou dashboards vinculados.");
      return;
    }

    toast.success("Empresa excluída com sucesso");
    setDeleteId(null);
    fetchCompanies();
  };

  const handleManageCompany = (company: Company) => {
    setSelectedCompany(company);
    setSheetOpen(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-hero opacity-30" />

      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-card/80 backdrop-blur-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">Master Admin</span>
              </div>
            </div>

            <Button variant="ghost" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 py-12">
        <Tabs defaultValue="companies" className="space-y-8">
          <TabsList>
            <TabsTrigger value="companies" className="gap-2">
              <Building2 className="h-4 w-4" />
              Empresas
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Assinaturas
            </TabsTrigger>
            <TabsTrigger value="legal-terms" className="gap-2">
              <FileText className="h-4 w-4" />
              Termos Legais
            </TabsTrigger>
            <TabsTrigger value="plans" className="gap-2">
              <Settings className="h-4 w-4" />
              Planos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="companies">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2">Gestão de Empresas</h1>
                <p className="text-muted-foreground">
                  Crie e gerencie as empresas, usuários, grupos, dashboards e assinaturas
                </p>
              </div>

              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) {
                  setEditingCompany(null);
                }
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Empresa
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingCompany ? "Editar Empresa" : "Nova Empresa"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingCompany 
                        ? "Atualize os dados da empresa" 
                        : "Preencha os dados para criar uma nova empresa"}
                    </DialogDescription>
                  </DialogHeader>
                  <CompanyForm 
                    editingCompany={editingCompany}
                    onSuccess={() => {
                      setDialogOpen(false);
                      setEditingCompany(null);
                      fetchCompanies();
                    }}
                    onCancel={() => {
                      setDialogOpen(false);
                      setEditingCompany(null);
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : companies.length === 0 ? (
          <Card className="bg-card/80 backdrop-blur-md p-12 border-border/50 text-center">
            <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhuma empresa cadastrada</h3>
            <p className="text-muted-foreground mb-4">
              Clique em "Nova Empresa" para começar
            </p>
          </Card>
        ) : (
          <Card className="bg-card/80 backdrop-blur-md border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead className="text-center">Usuários</TableHead>
                  <TableHead className="text-center">Dashboards</TableHead>
                  <TableHead className="text-center">Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company, index) => (
                  <motion.tr
                    key={company.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group"
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        {company.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {company.cnpj}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {company._count?.users || 0}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                        {company._count?.dashboards || 0}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {new Date(company.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleManageCompany(company)}
                        >
                          <Settings className="mr-2 h-4 w-4" />
                          Gerenciar
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(company)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(company.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
          </TabsContent>

          <TabsContent value="legal-terms">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Termos Legais</h1>
              <p className="text-muted-foreground">
                Gerencie as políticas e termos legais da plataforma
              </p>
            </div>
            <LegalTermsEditor />
          </TabsContent>

          <TabsContent value="subscriptions">
            <SubscriptionsManager />
          </TabsContent>

          <TabsContent value="plans">
            <PlansManager />
          </TabsContent>
        </Tabs>
      </main>

      {/* Company Management Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {selectedCompany?.name}
            </SheetTitle>
          </SheetHeader>

          {selectedCompany && (
            <Tabs defaultValue="users" className="mt-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="users" className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Usuários</span>
                </TabsTrigger>
                <TabsTrigger value="groups" className="flex items-center gap-1">
                  <FolderOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">Grupos</span>
                </TabsTrigger>
                <TabsTrigger value="dashboards" className="flex items-center gap-1">
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">Dashboards</span>
                </TabsTrigger>
                <TabsTrigger value="subscription" className="flex items-center gap-1">
                  <CreditCard className="h-4 w-4" />
                  <span className="hidden sm:inline">Assinatura</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="users" className="mt-6">
                <CompanyUsersManager 
                  companyId={selectedCompany.id} 
                  companyName={selectedCompany.name}
                />
              </TabsContent>

              <TabsContent value="groups" className="mt-6">
                <CompanyGroupsManager 
                  companyId={selectedCompany.id} 
                  companyName={selectedCompany.name}
                />
              </TabsContent>

              <TabsContent value="dashboards" className="mt-6">
                <CompanyDashboardsManager 
                  companyId={selectedCompany.id} 
                  companyName={selectedCompany.name}
                />
              </TabsContent>

              <TabsContent value="subscription" className="mt-6">
                <CompanySubscriptionManager 
                  companyId={selectedCompany.id} 
                  companyName={selectedCompany.name}
                />
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os dados relacionados à empresa serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MasterAdmin;
