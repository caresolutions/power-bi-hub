import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Settings, 
  Users, 
  LayoutDashboard, 
  LogOut,
  CreditCard,
  Shield,
  ChevronRight,
  Cog,
  Star,
  BarChart3
} from "lucide-react";
import { motion } from "framer-motion";
import { useCompanyCustomization } from "@/hooks/useCompanyCustomization";
import { useDashboardFavorites } from "@/hooks/useDashboardFavorites";

type UserRole = 'admin' | 'user';

interface FavoriteDashboard {
  id: string;
  name: string;
}

const Home = () => {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [favoriteDashboards, setFavoriteDashboards] = useState<FavoriteDashboard[]>([]);
  const navigate = useNavigate();
  const { customization } = useCompanyCustomization();
  const { favorites } = useDashboardFavorites();

  useEffect(() => {
    checkAuthAndRole();
  }, []);

  useEffect(() => {
    if (favorites.length > 0) {
      fetchFavoriteDashboards();
    } else {
      setFavoriteDashboards([]);
    }
  }, [favorites]);

  const checkAuthAndRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    // Check user role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData) {
      setUserRole(roleData.role as UserRole);
    }
    setLoading(false);
  };

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
    navigate("/");
  };

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
      title: "Assinatura",
      description: "Gerencie seu plano e pagamentos",
      icon: CreditCard,
      path: "/subscription",
      color: "bg-amber-500/10 text-amber-500"
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

  const menuItems = userRole === 'admin' ? adminMenuItems : userMenuItems;

  if (loading) {
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
      <header className="relative z-10 border-b border-border/50 bg-card/80 backdrop-blur-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {customization?.logo_url ? (
                <img 
                  src={customization.logo_url} 
                  alt="Logo" 
                  className="h-10 w-auto max-w-[150px] object-contain"
                />
              ) : (
                <>
                  <span className="text-2xl font-bold text-foreground">care</span>
                  <ChevronRight className="h-5 w-5 text-primary" />
                  <ChevronRight className="h-5 w-5 text-primary -ml-3" />
                  <span className="text-lg font-medium text-muted-foreground ml-2">BI</span>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span className="capitalize">{userRole}</span>
              </div>
              
              {userRole === 'admin' && (
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
        <div className="mb-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Bem-vindo ao <span className="text-primary">Care BI</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {userRole === 'admin' 
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
};

export default Home;
