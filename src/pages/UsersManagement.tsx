import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { 
  ArrowLeft, 
  Users, 
  Plus, 
  Mail, 
  Trash2,
  Clock,
  CheckCircle,
  XCircle 
} from "lucide-react";
import { motion } from "framer-motion";
import InviteUserForm from "@/components/users/InviteUserForm";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Dashboard {
  id: string;
  name: string;
}

interface UserAccess {
  id: string;
  user_id: string;
  dashboard_id: string;
  profiles: {
    email: string;
    full_name: string | null;
  };
}

interface Invitation {
  id: string;
  email: string;
  dashboard_ids: string[];
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

const UsersManagement = () => {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<string>("");
  const [userAccess, setUserAccess] = useState<UserAccess[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [deletingAccessId, setDeletingAccessId] = useState<string | null>(null);
  const [deletingInviteId, setDeletingInviteId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    checkAuth();
    fetchDashboards();
    fetchInvitations();
  }, []);

  useEffect(() => {
    const dashboardParam = searchParams.get("dashboard");
    if (dashboardParam) {
      setSelectedDashboard(dashboardParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedDashboard) {
      fetchUserAccess();
    }
  }, [selectedDashboard]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    // Check if admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData?.role !== 'admin') {
      navigate("/home");
    }
  };

  const fetchDashboards = async () => {
    try {
      const { data, error } = await supabase
        .from("dashboards")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setDashboards(data || []);
      
      if (data && data.length > 0 && !selectedDashboard) {
        setSelectedDashboard(data[0].id);
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

  const fetchUserAccess = async () => {
    try {
      const { data, error } = await supabase
        .from("user_dashboard_access")
        .select("id, user_id, dashboard_id")
        .eq("dashboard_id", selectedDashboard);

      if (error) throw error;

      // Fetch profiles separately
      if (data && data.length > 0) {
        const userIds = data.map(d => d.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", userIds);

        const accessWithProfiles = data.map(access => ({
          ...access,
          profiles: profilesData?.find(p => p.id === access.user_id) || { email: "", full_name: null }
        }));
        
        setUserAccess(accessWithProfiles);
      } else {
        setUserAccess([]);
      }
    } catch (error: any) {
      console.error("Error fetching user access:", error);
    }
  };

  const fetchInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from("user_invitations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error: any) {
      console.error("Error fetching invitations:", error);
    }
  };

  const handleRevokeAccess = async () => {
    if (!deletingAccessId) return;

    try {
      const { error } = await supabase
        .from("user_dashboard_access")
        .delete()
        .eq("id", deletingAccessId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Acesso revogado com sucesso",
      });
      
      fetchUserAccess();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeletingAccessId(null);
    }
  };

  const handleCancelInvite = async () => {
    if (!deletingInviteId) return;

    try {
      const { error } = await supabase
        .from("user_invitations")
        .delete()
        .eq("id", deletingInviteId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Convite cancelado com sucesso",
      });
      
      fetchInvitations();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeletingInviteId(null);
    }
  };

  const handleInviteSuccess = () => {
    setShowInviteForm(false);
    fetchInvitations();
  };

  const getInvitationStatus = (invitation: Invitation) => {
    if (invitation.accepted_at) {
      return { icon: CheckCircle, color: "text-green-500", label: "Aceito" };
    }
    if (new Date(invitation.expires_at) < new Date()) {
      return { icon: XCircle, color: "text-destructive", label: "Expirado" };
    }
    return { icon: Clock, color: "text-amber-500", label: "Pendente" };
  };

  const getDashboardNames = (dashboardIds: string[]) => {
    return dashboardIds
      .map(id => dashboards.find(d => d.id === id)?.name || "Desconhecido")
      .join(", ");
  };

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
                <div className="bg-green-500/10 p-2 rounded-lg">
                  <Users className="h-6 w-6 text-green-500" />
                </div>
                <h1 className="text-2xl font-bold">Gestão de Usuários</h1>
              </div>
            </div>
            
            {!showInviteForm && (
              <Button
                onClick={() => setShowInviteForm(true)}
                className="bg-primary hover:bg-primary/90 shadow-glow"
              >
                <Plus className="mr-2 h-5 w-5" />
                Convidar Usuário
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 py-12">
        {showInviteForm ? (
          <InviteUserForm 
            dashboards={dashboards}
            onSuccess={handleInviteSuccess}
            onCancel={() => setShowInviteForm(false)}
          />
        ) : (
          <div className="space-y-12">
            {/* Pending Invitations */}
            <section>
              <h2 className="text-2xl font-bold mb-6">Convites Enviados</h2>
              
              {invitations.length === 0 ? (
                <Card className="glass p-8 text-center border-border/50">
                  <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhum convite enviado</p>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {invitations.map((invitation, index) => {
                    const status = getInvitationStatus(invitation);
                    return (
                      <motion.div
                        key={invitation.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="glass p-4 border-border/50 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="bg-muted p-2 rounded-lg">
                              <Mail className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium">{invitation.email}</p>
                              <p className="text-sm text-muted-foreground">
                                Dashboards: {getDashboardNames(invitation.dashboard_ids)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className={`flex items-center gap-2 ${status.color}`}>
                              <status.icon className="h-4 w-4" />
                              <span className="text-sm">{status.label}</span>
                            </div>
                            {!invitation.accepted_at && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeletingInviteId(invitation.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* User Access by Dashboard */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Acesso por Dashboard</h2>
                
                {dashboards.length > 0 && (
                  <Select value={selectedDashboard} onValueChange={setSelectedDashboard}>
                    <SelectTrigger className="w-64 bg-background/50">
                      <SelectValue placeholder="Selecione um dashboard" />
                    </SelectTrigger>
                    <SelectContent>
                      {dashboards.map((dashboard) => (
                        <SelectItem key={dashboard.id} value={dashboard.id}>
                          {dashboard.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Carregando...</p>
                </div>
              ) : dashboards.length === 0 ? (
                <Card className="glass p-8 text-center border-border/50">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Crie um dashboard primeiro para gerenciar acessos
                  </p>
                </Card>
              ) : userAccess.length === 0 ? (
                <Card className="glass p-8 text-center border-border/50">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Nenhum usuário com acesso a este dashboard
                  </p>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {userAccess.map((access, index) => (
                    <motion.div
                      key={access.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="glass p-4 border-border/50 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="bg-green-500/10 p-2 rounded-lg">
                            <Users className="h-5 w-5 text-green-500" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {access.profiles?.full_name || "Sem nome"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {access.profiles?.email}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingAccessId(access.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Revoke Access Dialog */}
      <AlertDialog open={!!deletingAccessId} onOpenChange={() => setDeletingAccessId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar acesso</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja revogar o acesso deste usuário ao dashboard?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevokeAccess} className="bg-destructive hover:bg-destructive/90">
              Revogar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Invite Dialog */}
      <AlertDialog open={!!deletingInviteId} onOpenChange={() => setDeletingInviteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar convite</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar este convite?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelInvite} className="bg-destructive hover:bg-destructive/90">
              Cancelar Convite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UsersManagement;
