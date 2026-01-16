import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Settings, 
  Users, 
  LayoutDashboard, 
  LogOut,
  CreditCard,
  Shield,
  Cog,
  Star,
  BarChart3,
  Building2,
  Users2,
  Activity,
  UserPlus,
  Loader2,
  Rocket,
  ArrowRight,
  Pencil
} from "lucide-react";
import careLogo from "@/assets/logo_care_azul.png";
import { motion } from "framer-motion";
import { useCompanyCustomization } from "@/hooks/useCompanyCustomization";
import { useDashboardFavorites } from "@/hooks/useDashboardFavorites";
import { SubscriptionAlert } from "@/components/subscription/SubscriptionAlert";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";

type UserRole = 'admin' | 'user' | 'master_admin';

interface FavoriteDashboard {
  id: string;
  name: string;
}

const Home = () => {
  const { role, loading: authLoading, user } = useAuth();
  const [favoriteDashboards, setFavoriteDashboards] = useState<FavoriteDashboard[]>([]);
  const [showOnboardingBanner, setShowOnboardingBanner] = useState(false);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isEditNameOpen, setIsEditNameOpen] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const navigate = useNavigate();
  const { customization } = useCompanyCustomization();
  const { favorites } = useDashboardFavorites();
  const { toast } = useToast();

  // Fetch user profile and company name
  useEffect(() => {
    const fetchUserAndCompany = async () => {
      if (!user) return;
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, company_id")
        .eq("id", user.id)
        .maybeSingle();
      
      if (profile) {
        setUserName(profile.full_name || user.email?.split('@')[0] || null);
        
        if (profile.company_id) {
          const { data: company } = await supabase
            .from("companies")
            .select("name")
            .eq("id", profile.company_id)
            .maybeSingle();
          
          if (company) {
            setCompanyName(company.name);
          }
        }
      }
    };
    
    fetchUserAndCompany();
  }, [user]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  // Redirect admins to select plan if they haven't chosen one yet
  useEffect(() => {
    if (!authLoading && role === 'admin') {
      const checkPlanSelection = async () => {
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("plan, status")
          .eq("user_id", user?.id)
          .maybeSingle();

        // If plan is "free" AND status is NOT "trial", redirect to plan selection
        // (status=trial means user already selected a plan and started trial)
        if (subscription?.plan === "free" && subscription?.status !== "trial") {
          navigate("/select-plan");
        }
      };
      
      if (user) {
        checkPlanSelection();
      }
    }
  }, [authLoading, role, user, navigate]);

  // Check if admin needs onboarding based on onboarding_progress
  useEffect(() => {
    const checkOnboardingNeeded = async () => {
      if (!user || role !== 'admin') return;
      
      // Check onboarding_progress table
      const { data: progress } = await supabase
        .from("onboarding_progress")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      // Show banner if:
      // - No progress record exists, OR
      // - Not dismissed AND not completed (credentials or dashboards not configured)
      if (!progress) {
        setShowOnboardingBanner(true);
      } else if (!progress.dismissed && !progress.completed_at) {
        // Show if not dismissed and either credentials or dashboards not configured
        if (!progress.credentials_configured || !progress.dashboards_created) {
          setShowOnboardingBanner(true);
        }
      }
    };

    checkOnboardingNeeded();
  }, [user, role]);

  useEffect(() => {
    if (favorites.length > 0) {
      fetchFavoriteDashboards();
    } else {
      setFavoriteDashboards([]);
    }
  }, [favorites]);

  const fetchFavoriteDashboards = async () => {
    if (favorites.length === 0) return;

    const { data } = await supabase
      .from("dashboards")
      .select("id, name")
      .in("id", favorites)
      .limit(4);

    if (data) {
      setFavoriteDashboards(data);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  const handleOpenEditName = () => {
    setEditingName(userName || "");
    setIsEditNameOpen(true);
  };

  const handleSaveName = async () => {
    if (!user || !editingName.trim()) return;
    
    setSavingName(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: editingName.trim() })
        .eq("id", user.id);

      if (error) throw error;

      setUserName(editingName.trim());
      setIsEditNameOpen(false);
      toast({
        title: "Nome atualizado!",
        description: "Seu nome foi salvo com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar nome",
        variant: "destructive",
      });
    } finally {
      setSavingName(false);
    }
  };

  // Map context role to component role type
  const userRole: UserRole | null = role as UserRole | null;

  const masterAdminMenuItems = [
    {
      title: "Gestão de Empresas",
      description: "Crie e gerencie empresas do sistema",
      icon: Building2,
      path: "/master-admin",
      color: "bg-purple-500/10 text-purple-500"
    },
    {
      title: "Configuração de Ambiente",
      description: "Gerencie credenciais do Power BI",
      icon: Settings,
      path: "/credentials",
      color: "bg-primary/10 text-primary"
    },
    {
      title: "Visualizar Dashboards",
      description: "Acesse todos os dashboards",
      icon: LayoutDashboard,
      path: "/dashboards",
      color: "bg-accent/10 text-accent"
    },
    {
      title: "Controle de Acessos",
      description: "Monitore acessos aos dashboards",
      icon: Activity,
      path: "/access-logs",
      color: "bg-rose-500/10 text-rose-500"
    }
  ];

  const adminMenuItems = [
    {
      title: "Configuração de Ambiente",
      description: "Gerencie suas credenciais do Power BI",
      icon: Settings,
      path: "/credentials",
      color: "bg-primary/10 text-primary"
    },
    {
      title: "Gestão de Dashboards",
      description: "Adicione e gerencie seus dashboards",
      icon: LayoutDashboard,
      path: "/dashboards",
      color: "bg-accent/10 text-accent"
    },
    {
      title: "Gestão de Usuários",
      description: "Convide e gerencie usuários",
      icon: Users,
      path: "/users",
      color: "bg-green-500/10 text-green-500"
    },
    {
      title: "Gestão de Grupos",
      description: "Crie grupos e libere dashboards em massa",
      icon: Users2,
      path: "/groups",
      color: "bg-indigo-500/10 text-indigo-500"
    },
    {
      title: "Controle de Acessos",
      description: "Monitore acessos aos dashboards",
      icon: Activity,
      path: "/access-logs",
      color: "bg-rose-500/10 text-rose-500"
    },
    {
      title: "Assinatura",
      description: "Gerencie seu plano e pagamentos",
      icon: CreditCard,
      path: "/subscription",
      color: "bg-amber-500/10 text-amber-500"
    },
    {
      title: "Contratar Usuários",
      description: "Adicione mais usuários à sua conta",
      icon: UserPlus,
      path: "/add-users",
      color: "bg-teal-500/10 text-teal-500"
    }
  ];

  const userMenuItems = [
    {
      title: "Meus Dashboards",
      description: "Visualize os dashboards disponíveis",
      icon: LayoutDashboard,
      path: "/dashboards",
      color: "bg-primary/10 text-primary"
    }
  ];

  const menuItems = userRole === 'master_admin' 
    ? masterAdminMenuItems 
    : userRole === 'admin' 
      ? adminMenuItems 
      : userMenuItems;

  const getRoleLabel = () => {
    switch (userRole) {
      case 'master_admin': return 'Master Admin';
      case 'admin': return 'Admin';
      default: return 'Usuário';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const content = (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-hero opacity-30" />
      
      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-card/80 backdrop-blur-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {customization?.logo_url ? (
                <img 
                  src={customization.logo_url} 
                  alt="Logo" 
                  className="h-10 w-auto max-w-[150px] object-contain"
                />
              ) : (
                <img src={careLogo} alt="Care" className="h-10 w-auto" />
              )}
              
              {/* Company Info */}
              {companyName && (
                <div className="hidden md:flex items-center gap-2 pl-4 border-l border-border/50">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{companyName}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              {userRole !== 'master_admin' && (
                <button 
                  onClick={handleOpenEditName}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
                >
                  <Shield className="h-4 w-4" />
                  <span>{userName || getRoleLabel()}</span>
                  <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
              
              {userRole === 'master_admin' && (
                <Button variant="ghost" onClick={() => navigate("/master-admin")}>
                  <Shield className="mr-2 h-4 w-4" />
                  Master Admin
                </Button>
              )}
              
              {(userRole === 'admin' || userRole === 'master_admin') && (
                <Button variant="ghost" onClick={() => navigate("/settings")}>
                  <Cog className="mr-2 h-4 w-4" />
                  Configurações
                </Button>
              )}
              
              <Button variant="ghost" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 py-12">
        {/* Subscription Alert */}
        {userRole !== 'master_admin' && <SubscriptionAlert />}

        {/* Onboarding Banner */}
        {showOnboardingBanner && userRole === 'admin' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border-primary/30 p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/20 p-3 rounded-xl">
                    <Rocket className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Configure sua plataforma</h3>
                    <p className="text-muted-foreground text-sm">
                      Complete o onboarding guiado para configurar credenciais e dashboards
                    </p>
                  </div>
                </div>
                <Button onClick={() => navigate("/onboarding")} className="shadow-glow">
                  Iniciar Configuração
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        <div className="mb-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Bem-vindo ao <span className="text-primary">Care BI</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {userRole === 'master_admin' 
              ? "Gerencie empresas e tenha acesso completo ao sistema"
              : userRole === 'admin' 
                ? "Gerencie suas credenciais, dashboards e usuários em um só lugar"
                : "Acesse os dashboards disponíveis para você"}
          </p>
        </div>

        {/* Favorites Quick Access */}
        {favoriteDashboards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="flex items-center gap-2 mb-4">
              <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
              <h3 className="text-xl font-bold">Acesso Rápido</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {favoriteDashboards.map((dashboard, index) => (
                <motion.div
                  key={dashboard.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className="bg-card/60 backdrop-blur-md p-4 border-border/50 hover:border-amber-400/50 transition-all duration-300 cursor-pointer group"
                    onClick={() => navigate(`/dashboard/${dashboard.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-amber-500/10 p-2 rounded-lg group-hover:scale-110 transition-transform">
                        <BarChart3 className="h-5 w-5 text-amber-500" />
                      </div>
                      <span className="font-medium text-sm line-clamp-2">{dashboard.name}</span>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {menuItems.map((item, index) => (
            <motion.div
              key={item.path}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card 
                className="bg-card/80 backdrop-blur-md p-8 border-border/50 hover:border-primary/50 transition-all duration-300 cursor-pointer group"
                onClick={() => navigate(item.path)}
              >
                <div className={`${item.color} p-4 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform`}>
                  <item.icon className="h-8 w-8" />
                </div>
                
                <h3 className="text-2xl font-bold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );

  // Master admins don't need subscription guard
  if (userRole === 'master_admin') {
    return (
      <>
        {content}
        <Dialog open={isEditNameOpen} onOpenChange={setIsEditNameOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Editar Nome</DialogTitle>
              <DialogDescription>
                Atualize seu nome de exibição
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  placeholder="Seu nome completo"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditNameOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveName} disabled={savingName || !editingName.trim()}>
                {savingName ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <SubscriptionGuard>
      {content}
      <Dialog open={isEditNameOpen} onOpenChange={setIsEditNameOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Nome</DialogTitle>
            <DialogDescription>
              Atualize seu nome de exibição
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                placeholder="Seu nome completo"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditNameOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveName} disabled={savingName || !editingName.trim()}>
              {savingName ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SubscriptionGuard>
  );
};

export default Home;