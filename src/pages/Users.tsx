import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Users as UsersIcon, Plus } from "lucide-react";
import { motion } from "framer-motion";
import InviteUserDialog from "@/components/users/InviteUserDialog";
import UserAccessList from "@/components/users/UserAccessList";

interface Dashboard {
  id: string;
  name: string;
}

const Users = () => {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    checkAuth();
    fetchDashboards();
    
    // Check if there's a dashboard ID in the URL
    const dashboardId = searchParams.get("dashboard");
    if (dashboardId) {
      setSelectedDashboard(dashboardId);
    }
  }, [searchParams]);

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
        .select("id, name")
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
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-5xl mx-auto"
        >
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 p-3 rounded-lg">
                <UsersIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Gestão de Usuários</h1>
                <p className="text-muted-foreground">
                  Convide usuários e gerencie permissões de acesso aos dashboards
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : dashboards.length === 0 ? (
            <Card className="glass p-12 text-center border-border/50">
              <UsersIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-2xl font-bold mb-2">Nenhum dashboard</h3>
              <p className="text-muted-foreground mb-6">
                Você precisa criar um dashboard primeiro antes de gerenciar usuários
              </p>
              <Button
                onClick={() => navigate("/dashboard")}
                className="bg-primary hover:bg-primary/90"
              >
                Ir para Dashboards
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Dashboard Selection */}
              <Card className="glass p-6 border-border/50">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold mb-2">Selecione um Dashboard</h2>
                    <p className="text-sm text-muted-foreground">
                      Escolha qual dashboard deseja gerenciar os acessos
                    </p>
                  </div>
                  {selectedDashboard && (
                    <Button
                      onClick={() => setInviteDialogOpen(true)}
                      className="bg-primary hover:bg-primary/90 shadow-glow"
                    >
                      <Plus className="mr-2 h-5 w-5" />
                      Convidar Usuário
                    </Button>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {dashboards.map((dashboard) => (
                    <button
                      key={dashboard.id}
                      onClick={() => setSelectedDashboard(dashboard.id)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        selectedDashboard === dashboard.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50 bg-card/50"
                      }`}
                    >
                      <h3 className="font-semibold">{dashboard.name}</h3>
                    </button>
                  ))}
                </div>
              </Card>

              {/* User Access List */}
              {selectedDashboard && (
                <UserAccessList
                  dashboardId={selectedDashboard}
                  onAccessRevoked={() => {
                    // Refresh could be triggered here if needed
                  }}
                />
              )}
            </div>
          )}
        </motion.div>
      </main>

      {/* Invite Dialog */}
      {selectedDashboard && (
        <InviteUserDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          dashboardId={selectedDashboard}
          onUserInvited={() => {
            // Trigger refresh of user list
          }}
        />
      )}
    </div>
  );
};

export default Users;
