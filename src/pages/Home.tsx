import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  BarChart3, 
  Settings, 
  Users, 
  LayoutDashboard, 
  LogOut,
  CreditCard,
  Shield
} from "lucide-react";
import { motion } from "framer-motion";

type UserRole = 'admin' | 'user';

const Home = () => {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthAndRole();
  }, []);

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
      <header className="relative z-10 border-b border-border/50 bg-card/30 backdrop-blur">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">Power BI Manager</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span className="capitalize">{userRole}</span>
              </div>
              
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
          <h2 className="text-4xl font-bold mb-4">
            Bem-vindo ao <span className="gradient-text">Power BI Manager</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {userRole === 'admin' 
              ? "Gerencie suas credenciais, dashboards e usuários em um só lugar"
              : "Acesse os dashboards disponíveis para você"}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {menuItems.map((item, index) => (
            <motion.div
              key={item.path}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card 
                className="glass p-8 border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-glow cursor-pointer group"
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
