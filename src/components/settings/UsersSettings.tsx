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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Users, Pencil, Save, Shield, User } from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'user';
}

export const UsersSettings = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", role: "" });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get current user's company_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile?.company_id) {
      setLoading(false);
      return;
    }

    // Fetch all profiles in the same company
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("company_id", profile.company_id);

    if (profiles) {
      // Fetch roles for each user
      const usersWithRoles: UserProfile[] = [];
      
      for (const p of profiles) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", p.id)
          .single();
        
        usersWithRoles.push({
          ...p,
          role: (roleData?.role as 'admin' | 'user') || 'user'
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
      // Delete existing role
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", editingUser.id);

      // Insert new role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: editingUser.id, role: editForm.role as 'admin' | 'user' });

      if (roleError) {
        toast({
          title: "Erro",
          description: "Não foi possível atualizar a função",
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

  if (loading) {
    return <div className="text-muted-foreground">Carregando...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle>Usuários da Empresa</CardTitle>
          </div>
          <CardDescription>
            Visualize e edite os usuários cadastrados na sua empresa
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
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.full_name || "-"}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.role === 'admin' ? (
                            <Shield className="h-4 w-4 text-primary" />
                          ) : (
                            <User className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="capitalize">{user.role === 'admin' ? 'Admin' : 'Usuário'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
    </>
  );
};
