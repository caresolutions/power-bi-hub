import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Users, 
  Plus, 
  Mail, 
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  LayoutDashboard,
  Users2,
  UserCog,
  ChevronRight
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

interface User {
  id: string;
  email: string;
  full_name: string | null;
}

interface UserGroup {
  id: string;
  name: string;
  description: string | null;
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
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null);
  const [userAccess, setUserAccess] = useState<UserAccess[]>([]);
  const [userDashboards, setUserDashboards] = useState<string[]>([]);
  const [groupDashboards, setGroupDashboards] = useState<string[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [deletingAccessId, setDeletingAccessId] = useState<string | null>(null);
  const [deletingInviteId, setDeletingInviteId] = useState<string | null>(null);
  const [userDashboardsDialogOpen, setUserDashboardsDialogOpen] = useState(false);
  const [groupDashboardsDialogOpen, setGroupDashboardsDialogOpen] = useState(false);
  const [savingUserDashboards, setSavingUserDashboards] = useState(false);
  const [savingGroupDashboards, setSavingGroupDashboards] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    checkAuth();
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

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData?.role !== 'admin' && roleData?.role !== 'master_admin') {
      navigate("/home");
      return;
    }

    fetchDashboards();
    fetchUsers();
    fetchGroups();
    fetchInvitations();
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

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .order("email");
    setUsers(data || []);
  };

  const fetchGroups = async () => {
    const { data } = await supabase
      .from("user_groups")
      .select("id, name, description")
      .order("name");
    setGroups(data || []);
  };

  const fetchUserAccess = async () => {
    try {
      const { data, error } = await supabase
        .from("user_dashboard_access")
        .select("id, user_id, dashboard_id")
        .eq("dashboard_id", selectedDashboard);

      if (error) throw error;

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

  const fetchUserDashboards = async (user: User) => {
    setSelectedUser(user);
    const { data } = await supabase
      .from("user_dashboard_access")
      .select("dashboard_id")
      .eq("user_id", user.id);
    
    setUserDashboards((data || []).map(d => d.dashboard_id));
    setUserDashboardsDialogOpen(true);
  };

  const fetchGroupDashboards = async (group: UserGroup) => {
    setSelectedGroup(group);
    const { data } = await supabase
      .from("group_dashboard_access")
      .select("dashboard_id")
      .eq("group_id", group.id);
    
    setGroupDashboards((data || []).map(d => d.dashboard_id));
    setGroupDashboardsDialogOpen(true);
  };

  const handleSaveUserDashboards = async () => {
    if (!selectedUser) return;
    setSavingUserDashboards(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Get current access
      const { data: currentAccess } = await supabase
        .from("user_dashboard_access")
        .select("dashboard_id")
        .eq("user_id", selectedUser.id);

      const currentIds = (currentAccess || []).map(a => a.dashboard_id);
      
      // Dashboards to add
      const toAdd = userDashboards.filter(id => !currentIds.includes(id));
      // Dashboards to remove
      const toRemove = currentIds.filter(id => !userDashboards.includes(id));

      // Add new access
      if (toAdd.length > 0) {
        await supabase
          .from("user_dashboard_access")
          .insert(toAdd.map(dashboardId => ({
            user_id: selectedUser.id,
            dashboard_id: dashboardId,
            granted_by: user.id
          })));
      }

      // Remove access
      if (toRemove.length > 0) {
        await supabase
          .from("user_dashboard_access")
          .delete()
          .eq("user_id", selectedUser.id)
          .in("dashboard_id", toRemove);
      }

      toast({ title: "Sucesso", description: "Permissões atualizadas" });
      setUserDashboardsDialogOpen(false);
      fetchUserAccess();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setSavingUserDashboards(false);
    }
  };

  const handleSaveGroupDashboards = async () => {
    if (!selectedGroup) return;
    setSavingGroupDashboards(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Get current access
      const { data: currentAccess } = await supabase
        .from("group_dashboard_access")
        .select("dashboard_id")
        .eq("group_id", selectedGroup.id);

      const currentIds = (currentAccess || []).map(a => a.dashboard_id);
      
      // Dashboards to add
      const toAdd = groupDashboards.filter(id => !currentIds.includes(id));
      // Dashboards to remove
      const toRemove = currentIds.filter(id => !groupDashboards.includes(id));

      // Add new access
      if (toAdd.length > 0) {
        await supabase
          .from("group_dashboard_access")
          .insert(toAdd.map(dashboardId => ({
            group_id: selectedGroup.id,
            dashboard_id: dashboardId,
            granted_by: user.id
          })));
      }

      // Remove access
      if (toRemove.length > 0) {
        await supabase
          .from("group_dashboard_access")
          .delete()
          .eq("group_id", selectedGroup.id)
          .in("dashboard_id", toRemove);
      }

      toast({ title: "Sucesso", description: "Permissões do grupo atualizadas" });
      setGroupDashboardsDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setSavingGroupDashboards(false);
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
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate("/groups")}
              >
                <Users2 className="mr-2 h-4 w-4" />
                Grupos
              </Button>
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
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 py-8">
        {showInviteForm ? (
          <InviteUserForm 
            dashboards={dashboards}
            onSuccess={handleInviteSuccess}
            onCancel={() => setShowInviteForm(false)}
          />
        ) : (
          <Tabs defaultValue="invitations" className="space-y-6">
            <TabsList className="bg-card/50">
              <TabsTrigger value="invitations">
                <Mail className="h-4 w-4 mr-2" />
                Convites
              </TabsTrigger>
              <TabsTrigger value="by-dashboard">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Por Dashboard
              </TabsTrigger>
              <TabsTrigger value="by-user">
                <UserCog className="h-4 w-4 mr-2" />
                Por Usuário
              </TabsTrigger>
              <TabsTrigger value="by-group">
                <Users2 className="h-4 w-4 mr-2" />
                Por Grupo
              </TabsTrigger>
            </TabsList>

            {/* Invitations Tab */}
            <TabsContent value="invitations">
              <Card className="bg-card/80 backdrop-blur-md border-border/50 p-6">
                <h2 className="text-xl font-bold mb-4">Convites Enviados</h2>
                {invitations.length === 0 ? (
                  <div className="text-center py-8">
                    <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Nenhum convite enviado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {invitations.map((invitation, index) => {
                      const status = getInvitationStatus(invitation);
                      return (
                        <motion.div
                          key={invitation.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between p-4 rounded-lg bg-muted/30"
                        >
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
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* By Dashboard Tab */}
            <TabsContent value="by-dashboard">
              <Card className="bg-card/80 backdrop-blur-md border-border/50 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Acesso por Dashboard</h2>
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
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Carregando...</p>
                  </div>
                ) : dashboards.length === 0 ? (
                  <div className="text-center py-8">
                    <LayoutDashboard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Crie um dashboard primeiro para gerenciar acessos
                    </p>
                  </div>
                ) : userAccess.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Nenhum usuário com acesso direto a este dashboard
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userAccess.map((access, index) => (
                      <motion.div
                        key={access.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/30"
                      >
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
                      </motion.div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* By User Tab */}
            <TabsContent value="by-user">
              <Card className="bg-card/80 backdrop-blur-md border-border/50 p-6">
                <h2 className="text-xl font-bold mb-4">Gerenciar por Usuário</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Clique em um usuário para gerenciar seus acessos aos dashboards
                </p>
                
                {users.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Nenhum usuário encontrado</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {users.map((user, index) => (
                      <motion.div
                        key={user.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => fetchUserDashboards(user)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 p-2 rounded-lg">
                            <UserCog className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{user.full_name || user.email}</p>
                            {user.full_name && (
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </motion.div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* By Group Tab */}
            <TabsContent value="by-group">
              <Card className="bg-card/80 backdrop-blur-md border-border/50 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold">Gerenciar por Grupo</h2>
                    <p className="text-sm text-muted-foreground">
                      Libere dashboards para todos os membros de um grupo de uma vez
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => navigate("/groups")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Gerenciar Grupos
                  </Button>
                </div>
                
                {groups.length === 0 ? (
                  <div className="text-center py-8">
                    <Users2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">Nenhum grupo criado</p>
                    <Button onClick={() => navigate("/groups")}>
                      Criar Primeiro Grupo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {groups.map((group, index) => (
                      <motion.div
                        key={group.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => fetchGroupDashboards(group)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-indigo-500/10 p-2 rounded-lg">
                            <Users2 className="h-4 w-4 text-indigo-500" />
                          </div>
                          <div>
                            <p className="font-medium">{group.name}</p>
                            {group.description && (
                              <p className="text-xs text-muted-foreground">{group.description}</p>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </motion.div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* User Dashboards Dialog */}
      <Dialog open={userDashboardsDialogOpen} onOpenChange={setUserDashboardsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dashboards do Usuário</DialogTitle>
            <DialogDescription>
              {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[300px] pr-4">
            {dashboards.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum dashboard disponível
              </p>
            ) : (
              <div className="space-y-2">
                {dashboards.map((dashboard) => (
                  <div
                    key={dashboard.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={userDashboards.includes(dashboard.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setUserDashboards([...userDashboards, dashboard.id]);
                        } else {
                          setUserDashboards(userDashboards.filter(id => id !== dashboard.id));
                        }
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4 text-primary" />
                      <span>{dashboard.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setUserDashboardsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveUserDashboards} disabled={savingUserDashboards}>
              {savingUserDashboards ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Group Dashboards Dialog */}
      <Dialog open={groupDashboardsDialogOpen} onOpenChange={setGroupDashboardsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dashboards do Grupo</DialogTitle>
            <DialogDescription>
              {selectedGroup?.name}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[300px] pr-4">
            {dashboards.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum dashboard disponível
              </p>
            ) : (
              <div className="space-y-2">
                {dashboards.map((dashboard) => (
                  <div
                    key={dashboard.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={groupDashboards.includes(dashboard.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setGroupDashboards([...groupDashboards, dashboard.id]);
                        } else {
                          setGroupDashboards(groupDashboards.filter(id => id !== dashboard.id));
                        }
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4 text-primary" />
                      <span>{dashboard.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setGroupDashboardsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveGroupDashboards} disabled={savingGroupDashboards}>
              {savingGroupDashboards ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
