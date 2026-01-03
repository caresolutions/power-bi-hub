import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { BarChart3, LogOut, Plus, Users } from "lucide-react";
import { motion } from "framer-motion";

interface Dashboard {
  id: string;
  name: string;
  workspace_id: string;
  dashboard_id: string;
  report_section: string;
}

const Dashboard = () => {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchDashboards();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
    }
  };

  const fetchDashboards = async () => {
    try {
      const { data, error } = await supabase
        .from("dashboards")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDashboards(data || []);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">Power BI Manager</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => navigate("/users")}
              >
                <Users className="mr-2 h-4 w-4" />
                Usuários
              </Button>
              
              <Button
                variant="ghost"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Meus Dashboards</h2>
            <p className="text-muted-foreground">
              Gerencie e compartilhe seus dashboards Power BI
            </p>
          </div>
          
          <Button
            onClick={() => navigate("/onboarding")}
            className="bg-primary hover:bg-primary/90 shadow-glow"
          >
            <Plus className="mr-2 h-5 w-5" />
            Adicionar Dashboard
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : dashboards.length === 0 ? (
          <Card className="glass p-12 text-center border-border/50">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-2xl font-bold mb-2">Nenhum dashboard ainda</h3>
            <p className="text-muted-foreground mb-6">
              Adicione seu primeiro dashboard Power BI para começar
            </p>
            <Button
              onClick={() => navigate("/onboarding")}
              className="bg-primary hover:bg-primary/90 shadow-glow"
            >
              <Plus className="mr-2 h-5 w-5" />
              Adicionar Dashboard
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboards.map((dashboard, index) => (
              <motion.div
                key={dashboard.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="glass p-6 border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-glow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="bg-primary/10 p-3 rounded-lg">
                      <BarChart3 className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold mb-3">{dashboard.name}</h3>
                  
                  <div className="space-y-2 text-sm text-muted-foreground font-mono">
                    <p className="truncate">WS: {dashboard.workspace_id}</p>
                    <p className="truncate">ID: {dashboard.dashboard_id}</p>
                  </div>
                  
                  <Button
                    variant="outline"
                    className="w-full mt-6"
                    onClick={() => navigate(`/users?dashboard=${dashboard.id}`)}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Gerenciar Acesso
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
