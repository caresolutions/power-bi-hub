import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  Users2, 
  Plus, 
  Edit2, 
  Trash2, 
  UserPlus,
  LayoutDashboard,
  ChevronRight,
  UserMinus
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";

interface UserGroup {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  _count?: {
    members: number;
    dashboards: number;
  };
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
}

interface Dashboard {
  id: string;
  name: string;
}

const UserGroups = () => {
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  
  // Group details state
  const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<User[]>([]);
  const [groupDashboards, setGroupDashboards] = useState<Dashboard[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [availableDashboards, setAvailableDashboards] = useState<Dashboard[]>([]);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addDashboardOpen, setAddDashboardOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedDashboards, setSelectedDashboards] = useState<string[]>([]);
  
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

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || (roleData.role !== "admin" && roleData.role !== "master_admin")) {
      toast.error("Acesso negado");
      navigate("/home");
      return;
    }

    fetchGroups();
  };

  const fetchGroups = async () => {
    setLoading(true);
    
    const { data: groupsData, error } = await supabase
      .from("user_groups")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Erro ao carregar grupos");
      setLoading(false);
      return;
    }

    // Fetch counts
    const groupsWithCounts = await Promise.all(
      (groupsData || []).map(async (group) => {
        const { count: membersCount } = await supabase
          .from("user_group_members")
          .select("*", { count: "exact", head: true })
          .eq("group_id", group.id);

        const { count: dashboardsCount } = await supabase
          .from("group_dashboard_access")
          .select("*", { count: "exact", head: true })
          .eq("group_id", group.id);

        return {
          ...group,
          _count: {
            members: membersCount || 0,
            dashboards: dashboardsCount || 0,
          },
        };
      })
    );

    setGroups(groupsWithCounts);
    setLoading(false);
  };

  const fetchGroupDetails = async (group: UserGroup) => {
    setSelectedGroup(group);
    
    // Fetch members
    const { data: membersData } = await supabase
      .from("user_group_members")
      .select("user_id")
      .eq("group_id", group.id);

    if (membersData && membersData.length > 0) {
      const userIds = membersData.map(m => m.user_id);
      const { data: usersData } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);
      setGroupMembers(usersData || []);
    } else {
      setGroupMembers([]);
    }

    // Fetch dashboards with access
    const { data: accessData } = await supabase
      .from("group_dashboard_access")
      .select("dashboard_id")
      .eq("group_id", group.id);

    if (accessData && accessData.length > 0) {
      const dashboardIds = accessData.map(a => a.dashboard_id);
      const { data: dashboardsData } = await supabase
        .from("dashboards")
        .select("id, name")
        .in("id", dashboardIds);
      setGroupDashboards(dashboardsData || []);
    } else {
      setGroupDashboards([]);
    }
  };

  const fetchAvailableUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .order("email");
    
    // Filter out users already in group
    const memberIds = groupMembers.map(m => m.id);
    setAvailableUsers((data || []).filter(u => !memberIds.includes(u.id)));
  };

  const fetchAvailableDashboards = async () => {
    const { data } = await supabase
      .from("dashboards")
      .select("id, name")
      .order("name");
    
    // Filter out dashboards already assigned
    const assignedIds = groupDashboards.map(d => d.id);
    setAvailableDashboards((data || []).filter(d => !assignedIds.includes(d.id)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error("Nome do grupo é obrigatório");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get user's company_id
    const { data: profileData } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profileData?.company_id) {
      toast.error("Empresa não encontrada");
      return;
    }

    if (editingGroup) {
      const { error } = await supabase
        .from("user_groups")
        .update({ name: formData.name, description: formData.description || null })
        .eq("id", editingGroup.id);

      if (error) {
        toast.error("Erro ao atualizar grupo");
        return;
      }
      toast.success("Grupo atualizado");
    } else {
      const { error } = await supabase
        .from("user_groups")
        .insert({ 
          name: formData.name, 
          description: formData.description || null,
          created_by: user.id,
          company_id: profileData.company_id
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("Já existe um grupo com este nome");
        } else {
          toast.error("Erro ao criar grupo");
        }
        return;
      }
      toast.success("Grupo criado");
    }

    setDialogOpen(false);
    setEditingGroup(null);
    setFormData({ name: "", description: "" });
    fetchGroups();
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase
      .from("user_groups")
      .delete()
      .eq("id", deleteId);

    if (error) {
      toast.error("Erro ao excluir grupo");
      return;
    }

    toast.success("Grupo excluído");
    setDeleteId(null);
    if (selectedGroup?.id === deleteId) {
      setSelectedGroup(null);
    }
    fetchGroups();
  };

  const handleAddMembers = async () => {
    if (!selectedGroup || selectedUsers.length === 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("user_group_members")
      .insert(selectedUsers.map(userId => ({
        group_id: selectedGroup.id,
        user_id: userId,
        added_by: user.id
      })));

    if (error) {
      toast.error("Erro ao adicionar membros");
      return;
    }

    toast.success("Membros adicionados");
    setAddMemberOpen(false);
    setSelectedUsers([]);
    fetchGroupDetails(selectedGroup);
    fetchGroups();
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedGroup) return;

    const { error } = await supabase
      .from("user_group_members")
      .delete()
      .eq("group_id", selectedGroup.id)
      .eq("user_id", userId);

    if (error) {
      toast.error("Erro ao remover membro");
      return;
    }

    toast.success("Membro removido");
    fetchGroupDetails(selectedGroup);
    fetchGroups();
  };

  const handleAddDashboards = async () => {
    if (!selectedGroup || selectedDashboards.length === 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("group_dashboard_access")
      .insert(selectedDashboards.map(dashboardId => ({
        group_id: selectedGroup.id,
        dashboard_id: dashboardId,
        granted_by: user.id
      })));

    if (error) {
      toast.error("Erro ao liberar dashboards");
      return;
    }

    toast.success("Dashboards liberados para o grupo");
    setAddDashboardOpen(false);
    setSelectedDashboards([]);
    fetchGroupDetails(selectedGroup);
    fetchGroups();
  };

  const handleRemoveDashboard = async (dashboardId: string) => {
    if (!selectedGroup) return;

    const { error } = await supabase
      .from("group_dashboard_access")
      .delete()
      .eq("group_id", selectedGroup.id)
      .eq("dashboard_id", dashboardId);

    if (error) {
      toast.error("Erro ao remover acesso");
      return;
    }

    toast.success("Acesso removido");
    fetchGroupDetails(selectedGroup);
    fetchGroups();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-hero opacity-30" />

      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-card/80 backdrop-blur-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Users2 className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">Gestão de Grupos</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Groups List */}
          <div className="lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Grupos</h2>
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) {
                  setEditingGroup(null);
                  setFormData({ name: "", description: "" });
                }
              }}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingGroup ? "Editar Grupo" : "Novo Grupo"}
                    </DialogTitle>
                    <DialogDescription>
                      Grupos permitem liberar dashboards para múltiplos usuários de uma vez
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome do Grupo</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: Equipe Comercial"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Descrição (opcional)</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Descrição do grupo"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit">
                        {editingGroup ? "Salvar" : "Criar"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <p className="text-muted-foreground text-center py-8">Carregando...</p>
            ) : groups.length === 0 ? (
              <Card className="bg-card/80 backdrop-blur-md p-8 border-border/50 text-center">
                <Users2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum grupo criado</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {groups.map((group) => (
                  <Card
                    key={group.id}
                    className={`bg-card/80 backdrop-blur-md p-4 border-border/50 cursor-pointer transition-all ${
                      selectedGroup?.id === group.id ? "border-primary" : "hover:border-primary/50"
                    }`}
                    onClick={() => fetchGroupDetails(group)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                          <Users2 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{group.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {group._count?.members || 0} membros · {group._count?.dashboards || 0} dashboards
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingGroup(group);
                            setFormData({ name: group.name, description: group.description || "" });
                            setDialogOpen(true);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(group.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Group Details */}
          <div className="lg:col-span-2">
            {selectedGroup ? (
              <Card className="bg-card/80 backdrop-blur-md border-border/50">
                <div className="p-6 border-b border-border/50">
                  <h2 className="text-xl font-bold">{selectedGroup.name}</h2>
                  {selectedGroup.description && (
                    <p className="text-muted-foreground mt-1">{selectedGroup.description}</p>
                  )}
                </div>

                <Tabs defaultValue="members" className="p-6">
                  <TabsList className="mb-4">
                    <TabsTrigger value="members">
                      <Users2 className="h-4 w-4 mr-2" />
                      Membros ({groupMembers.length})
                    </TabsTrigger>
                    <TabsTrigger value="dashboards">
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Dashboards ({groupDashboards.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="members">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-sm text-muted-foreground">
                        Usuários que pertencem a este grupo
                      </p>
                      <Dialog open={addMemberOpen} onOpenChange={(open) => {
                        setAddMemberOpen(open);
                        if (open) fetchAvailableUsers();
                        else setSelectedUsers([]);
                      }}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <UserPlus className="mr-2 h-4 w-4" />
                            Adicionar
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Adicionar Membros</DialogTitle>
                            <DialogDescription>
                              Selecione os usuários para adicionar ao grupo
                            </DialogDescription>
                          </DialogHeader>
                          <ScrollArea className="h-[300px] pr-4">
                            {availableUsers.length === 0 ? (
                              <p className="text-center text-muted-foreground py-8">
                                Todos os usuários já estão no grupo
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {availableUsers.map((user) => (
                                  <div
                                    key={user.id}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                                  >
                                    <Checkbox
                                      checked={selectedUsers.includes(user.id)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedUsers([...selectedUsers, user.id]);
                                        } else {
                                          setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                                        }
                                      }}
                                    />
                                    <div>
                                      <p className="font-medium">{user.full_name || user.email}</p>
                                      <p className="text-xs text-muted-foreground">{user.email}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </ScrollArea>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setAddMemberOpen(false)}>
                              Cancelar
                            </Button>
                            <Button onClick={handleAddMembers} disabled={selectedUsers.length === 0}>
                              Adicionar ({selectedUsers.length})
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {groupMembers.length === 0 ? (
                      <div className="text-center py-8">
                        <Users2 className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">Nenhum membro no grupo</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {groupMembers.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                          >
                            <div>
                              <p className="font-medium">{member.full_name || member.email}</p>
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRemoveMember(member.id)}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="dashboards">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-sm text-muted-foreground">
                        Dashboards liberados para todos os membros do grupo
                      </p>
                      <Dialog open={addDashboardOpen} onOpenChange={(open) => {
                        setAddDashboardOpen(open);
                        if (open) fetchAvailableDashboards();
                        else setSelectedDashboards([]);
                      }}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Liberar
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Liberar Dashboards</DialogTitle>
                            <DialogDescription>
                              Selecione os dashboards para liberar ao grupo
                            </DialogDescription>
                          </DialogHeader>
                          <ScrollArea className="h-[300px] pr-4">
                            {availableDashboards.length === 0 ? (
                              <p className="text-center text-muted-foreground py-8">
                                Todos os dashboards já estão liberados
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {availableDashboards.map((dashboard) => (
                                  <div
                                    key={dashboard.id}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                                  >
                                    <Checkbox
                                      checked={selectedDashboards.includes(dashboard.id)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedDashboards([...selectedDashboards, dashboard.id]);
                                        } else {
                                          setSelectedDashboards(selectedDashboards.filter(id => id !== dashboard.id));
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
                            <Button variant="outline" onClick={() => setAddDashboardOpen(false)}>
                              Cancelar
                            </Button>
                            <Button onClick={handleAddDashboards} disabled={selectedDashboards.length === 0}>
                              Liberar ({selectedDashboards.length})
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {groupDashboards.length === 0 ? (
                      <div className="text-center py-8">
                        <LayoutDashboard className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">Nenhum dashboard liberado</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {groupDashboards.map((dashboard) => (
                          <div
                            key={dashboard.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                          >
                            <div className="flex items-center gap-2">
                              <LayoutDashboard className="h-4 w-4 text-primary" />
                              <span className="font-medium">{dashboard.name}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRemoveDashboard(dashboard.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </Card>
            ) : (
              <Card className="bg-card/80 backdrop-blur-md p-12 border-border/50 text-center">
                <ChevronRight className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Selecione um grupo</h3>
                <p className="text-muted-foreground">
                  Clique em um grupo para ver e gerenciar seus membros e dashboards
                </p>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Grupo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os membros perderão o acesso aos dashboards do grupo.
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

const UserGroupsWithGuard = () => {
  const [checkingRole, setCheckingRole] = useState(true);
  const [isMaster, setIsMaster] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.rpc('is_master_admin', { _user_id: user.id });
        setIsMaster(!!data);
      }
      setCheckingRole(false);
    };
    checkRole();
  }, []);

  if (checkingRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (isMaster) {
    return <UserGroups />;
  }

  return (
    <SubscriptionGuard>
      <UserGroups />
    </SubscriptionGuard>
  );
};

export default UserGroupsWithGuard;
