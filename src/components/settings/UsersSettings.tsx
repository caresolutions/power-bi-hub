import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Users, Pencil, Save, Shield, User, Trash2, Download, UserCheck, UserX } from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'master_admin' | 'admin' | 'user';
  is_active: boolean;
}

interface UsersSettingsProps {
  companyId?: string | null;
}

export const UsersSettings = ({ companyId }: UsersSettingsProps) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", role: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exportFilter, setExportFilter] = useState<"all" | "active" | "inactive">("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, [companyId]);

  const fetchUsers = async () => {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);

    let targetCompanyId = companyId;

    // If no companyId provided, get from current user's profile
    if (!targetCompanyId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      targetCompanyId = profile?.company_id;
    }

    if (!targetCompanyId) {
      setLoading(false);
      return;
    }

    // Fetch all profiles in the target company
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name, is_active")
      .eq("company_id", targetCompanyId);

    if (profiles) {
      // Fetch roles for each user
      const usersWithRoles: UserProfile[] = [];
      
      for (const p of profiles) {
        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", p.id);
        
        // Determine highest role
        const roles = rolesData?.map(r => r.role) || [];
        let highestRole: 'master_admin' | 'admin' | 'user' = 'user';
        if (roles.includes('master_admin')) {
          highestRole = 'master_admin';
        } else if (roles.includes('admin')) {
          highestRole = 'admin';
        }
        
        usersWithRoles.push({
          ...p,
          is_active: p.is_active ?? true,
          role: highestRole
        });
      }
      
      setUsers(usersWithRoles);
    }
    setLoading(false);
  };

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user);
    setEditForm({ full_name: user.full_name || "", role: user.role });
  };

  const handleToggleActive = async (user: UserProfile) => {
    const newActiveState = !user.is_active;
    
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: newActiveState })
      .eq("id", user.id);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do usuário",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: newActiveState ? "Usuário ativado" : "Usuário inativado",
    });
    
    fetchUsers();
  };

  const handleSave = async () => {
    if (!editingUser) return;
    
    setSaving(true);
    
    // Update profile
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ full_name: editForm.full_name })
      .eq("id", editingUser.id);

    if (profileError) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil",
        variant: "destructive",
      });
      setSaving(false);
      return;
    }

    // Update role if changed
    if (editForm.role !== editingUser.role) {
      // First delete ALL existing roles for the user and wait for completion
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", editingUser.id);

      if (deleteError) {
        console.error("Error deleting roles:", deleteError);
        toast({
          title: "Erro",
          description: "Não foi possível remover a função anterior",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      // Insert new role with simple insert (not upsert)
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ 
          user_id: editingUser.id, 
          role: editForm.role as 'admin' | 'user' | 'master_admin' 
        });

      if (roleError) {
        console.error("Error inserting role:", roleError);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar a função: " + roleError.message,
          variant: "destructive",
        });
        setSaving(false);
        return;
      }
    }

    toast({
      title: "Sucesso",
      description: "Usuário atualizado com sucesso",
    });
    
    setEditingUser(null);
    setSaving(false);
    fetchUsers();
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    
    setDeleting(true);
    
    // Delete user role first
    await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", deletingUser.id);

    // Delete user dashboard access
    await supabase
      .from("user_dashboard_access")
      .delete()
      .eq("user_id", deletingUser.id);

    // Delete profile (this won't delete auth.users, but removes from company)
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", deletingUser.id);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover o usuário",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Usuário removido com sucesso",
      });
    }
    
    setDeletingUser(null);
    setDeleting(false);
    fetchUsers();
  };

  const handleExport = () => {
    let filteredUsers = users;
    
    if (exportFilter === "active") {
      filteredUsers = users.filter(u => u.is_active);
    } else if (exportFilter === "inactive") {
      filteredUsers = users.filter(u => !u.is_active);
    }

    // Create CSV content
    const headers = ["Nome", "Email", "Função", "Status"];
    const getRoleName = (role: string) => {
      if (role === 'master_admin') return 'Master Admin';
      if (role === 'admin') return 'Admin';
      return 'Usuário';
    };
    const rows = filteredUsers.map(user => [
      user.full_name || "-",
      user.email,
      getRoleName(user.role),
      user.is_active ? 'Ativo' : 'Inativo'
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    // Add BOM for UTF-8 encoding
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `usuarios_${exportFilter}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Exportação concluída",
      description: `${filteredUsers.length} usuários exportados`,
    });
  };

  if (loading) {
    return <div className="text-muted-foreground">Carregando...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>Usuários da Empresa</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Select value={exportFilter} onValueChange={(v) => setExportFilter(v as "all" | "active" | "inactive")}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Somente ativos</SelectItem>
                  <SelectItem value="inactive">Somente inativos</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </div>
          </div>
          <CardDescription>
            Visualize, edite ou remova os usuários cadastrados na sua empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-muted-foreground">Nenhum usuário encontrado.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[150px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className={!user.is_active ? "opacity-60" : ""}>
                      <TableCell className="font-medium">
                        {user.full_name || "-"}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.role === 'master_admin' ? (
                            <Shield className="h-4 w-4 text-yellow-500" />
                          ) : user.role === 'admin' ? (
                            <Shield className="h-4 w-4 text-primary" />
                          ) : (
                            <User className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="capitalize">
                            {user.role === 'master_admin' ? 'Master Admin' : user.role === 'admin' ? 'Admin' : 'Usuário'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.is_active ? (
                            <UserCheck className="h-4 w-4 text-green-500" />
                          ) : (
                            <UserX className="h-4 w-4 text-destructive" />
                          )}
                          <span className={user.is_active ? "text-green-500" : "text-destructive"}>
                            {user.is_active ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {user.id !== currentUserId && (
                            <Switch
                              checked={user.is_active}
                              onCheckedChange={() => handleToggleActive(user)}
                              title={user.is_active ? "Desativar usuário" : "Ativar usuário"}
                            />
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {user.id !== currentUserId && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingUser(user)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Atualize as informações do usuário
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={editingUser?.email || ""} disabled />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome Completo</Label>
              <Input
                id="edit-name"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                placeholder="Nome do usuário"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-role">Função</Label>
              <Select
                value={editForm.role}
                onValueChange={(value) => setEditForm({ ...editForm, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="master_admin">Master Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">Usuário</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{deletingUser?.email}</strong> da empresa? 
              Esta ação não pode ser desfeita e o usuário perderá acesso a todos os dashboards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
