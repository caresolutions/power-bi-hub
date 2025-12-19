import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, UserPlus, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SUBSCRIPTION_PLANS } from "./CompanyForm";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role?: string;
}

interface CompanyUsersManagerProps {
  companyId: string;
  companyName: string;
}

export function CompanyUsersManager({ companyId, companyName }: CompanyUsersManagerProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    full_name: "",
    role: "user" as "admin" | "user",
    plan: "free" as keyof typeof SUBSCRIPTION_PLANS,
  });
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [companyId]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch users in the company
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("company_id", companyId);

      if (error) throw error;

      // Fetch roles for each user
      const usersWithRoles = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", profile.id);

          // Get highest role
          const rolesList = roles?.map((r) => r.role) || [];
          let displayRole = "user";
          if (rolesList.includes("master_admin")) displayRole = "master_admin";
          else if (rolesList.includes("admin")) displayRole = "admin";

          return { ...profile, role: displayRole };
        })
      );

      setUsers(usersWithRoles);
    } catch (error: any) {
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteForm.email) {
      toast.error("Informe o e-mail do usuário");
      return;
    }

    setInviting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id, company_id")
        .eq("email", inviteForm.email)
        .maybeSingle();

      if (existingUser) {
        if (existingUser.company_id) {
          toast.error("Este usuário já está vinculado a uma empresa");
          return;
        }

        // Update existing user's company
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ 
            company_id: companyId,
            full_name: inviteForm.full_name || existingUser.id 
          })
          .eq("id", existingUser.id);

        if (updateError) throw updateError;

        // Update user role
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", existingUser.id);

        await supabase
          .from("user_roles")
          .insert({ user_id: existingUser.id, role: inviteForm.role });

        // Handle subscription for admin
        if (inviteForm.role === "admin") {
          const plan = SUBSCRIPTION_PLANS[inviteForm.plan];
          await supabase
            .from("subscriptions")
            .upsert({
              user_id: existingUser.id,
              status: plan.price_id ? "active" : "active",
              plan: inviteForm.plan,
              is_master_managed: !plan.price_id,
            });
        }

        toast.success("Usuário vinculado à empresa com sucesso");
      } else {
        // Create invitation
        const token = crypto.randomUUID();
        const { error: inviteError } = await supabase
          .from("user_invitations")
          .insert({
            email: inviteForm.email,
            company_id: companyId,
            invited_by: user.id,
            invited_role: inviteForm.role,
            token,
            dashboard_ids: [],
          });

        if (inviteError) throw inviteError;

        toast.success("Convite enviado com sucesso");
      }

      setDialogOpen(false);
      setInviteForm({ email: "", full_name: "", role: "user", plan: "free" });
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Erro ao convidar usuário");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveUser = async () => {
    if (!deleteUserId) return;

    try {
      // Remove user from company
      const { error } = await supabase
        .from("profiles")
        .update({ company_id: null })
        .eq("id", deleteUserId);

      if (error) throw error;

      // Remove dashboard access
      await supabase
        .from("user_dashboard_access")
        .delete()
        .eq("user_id", deleteUserId);

      // Remove group memberships
      await supabase
        .from("user_group_members")
        .delete()
        .eq("user_id", deleteUserId);

      toast.success("Usuário removido da empresa");
      setDeleteUserId(null);
      fetchUsers();
    } catch (error: any) {
      toast.error("Erro ao remover usuário");
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "master_admin":
        return <Badge variant="destructive">Master Admin</Badge>;
      case "admin":
        return <Badge variant="default">Admin</Badge>;
      default:
        return <Badge variant="secondary">Usuário</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Usuários de {companyName}</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie os usuários vinculados a esta empresa
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Adicionar Usuário
        </Button>
      </div>

      {loading ? (
        <p className="text-center py-8 text-muted-foreground">Carregando...</p>
      ) : users.length === 0 ? (
        <div className="text-center py-8 border rounded-lg">
          <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Nenhum usuário vinculado</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Função</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.full_name || "-"}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{getRoleBadge(user.role || "user")}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteUserId(user.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Add User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Usuário</DialogTitle>
            <DialogDescription>
              Vincule um usuário existente ou envie um convite
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={inviteForm.email}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, email: e.target.value })
                }
                placeholder="usuario@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input
                id="full_name"
                value={inviteForm.full_name}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, full_name: e.target.value })
                }
                placeholder="Nome do usuário"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Função</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(value: "admin" | "user") =>
                  setInviteForm({ ...inviteForm, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="user">Usuário</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {inviteForm.role === "admin" && (
              <div className="space-y-2">
                <Label htmlFor="plan">Plano de Assinatura</Label>
                <Select
                  value={inviteForm.plan}
                  onValueChange={(value: keyof typeof SUBSCRIPTION_PLANS) =>
                    setInviteForm({ ...inviteForm, plan: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => (
                      <SelectItem key={key} value={key}>
                        {plan.name} - {plan.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={inviting}>
                {inviting ? "Adicionando..." : "Adicionar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              O usuário será removido desta empresa e perderá acesso a todos os
              dashboards e grupos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
