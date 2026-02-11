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
import { Checkbox } from "@/components/ui/checkbox";
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
  const [deleteFromAuth, setDeleteFromAuth] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    full_name: "",
    role: "user" as "admin" | "user",
    plan: "starter" as keyof typeof SUBSCRIPTION_PLANS,
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

      // Call edge function to create user with temporary password
      const { data: createData, error: createError } = await supabase.functions.invoke(
        "create-invited-user",
        {
          body: {
            email: inviteForm.email,
            companyId: companyId,
            dashboardIds: [],
            invitedBy: user.id,
            invitedRole: inviteForm.role,
          },
        }
      );

      if (createError || !createData?.success) {
        throw new Error(createError?.message || createData?.error || "Erro ao criar usuário");
      }

      const temporaryPassword = createData.temporaryPassword;
      const isExistingUser = createData.isExistingUser;

      // Update full_name if provided
      if (inviteForm.full_name && createData.userId) {
        await supabase
          .from("profiles")
          .update({ full_name: inviteForm.full_name })
          .eq("id", createData.userId);
      }

      // Handle subscription for admin
      if (inviteForm.role === "admin" && createData.userId) {
        const plan = SUBSCRIPTION_PLANS[inviteForm.plan];
        await supabase
          .from("subscriptions")
          .upsert({
            user_id: createData.userId,
            status: "active",
            plan: inviteForm.plan,
            is_master_managed: !plan.price_id,
          });
      }

      // Send email
      const loginLink = "https://dashboards.care-br.com/auth";
      const roleLabel = inviteForm.role === "admin" ? "Administrador" : "Usuário";

      let emailContent: string;

      if (isExistingUser) {
        emailContent = `
          <h2 style="color: #0891b2; margin-bottom: 24px;">Novo Acesso Concedido</h2>
          <p style="color: #334155; font-size: 16px; line-height: 1.6;">
            Você foi adicionado à empresa <strong>${companyName}</strong> na plataforma Care BI como <strong>${roleLabel}</strong>.
          </p>
          <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-top: 24px;">
            Use suas credenciais existentes para acessar a plataforma:
          </p>
        `;
      } else {
        emailContent = `
          <h2 style="color: #0891b2; margin-bottom: 24px;">Bem-vindo ao Care BI!</h2>
          <p style="color: #334155; font-size: 16px; line-height: 1.6;">
            Você foi cadastrado na plataforma Care BI como <strong>${roleLabel}</strong> na empresa <strong>${companyName}</strong>.
          </p>
          <div style="background-color: #f0f9ff; border: 1px solid #0891b2; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="color: #0891b2; font-size: 14px; font-weight: 600; margin: 0 0 12px 0;">
              Suas credenciais de acesso:
            </p>
            <p style="color: #334155; font-size: 16px; margin: 0;">
              <strong>E-mail:</strong> ${inviteForm.email}<br/>
              <strong>Senha provisória:</strong> ${temporaryPassword}
            </p>
          </div>
          <p style="color: #dc2626; font-size: 14px; line-height: 1.6; margin-top: 16px;">
            <strong>Importante:</strong> Por segurança, você será solicitado a alterar sua senha no primeiro acesso.
          </p>
          <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-top: 24px;">
            Clique no botão abaixo para acessar a plataforma:
          </p>
        `;
      }

      const emailTemplate = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: 'Open Sans', Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4;">
    <tr><td align="center" style="padding: 40px 20px;">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <tr><td style="background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); padding: 30px 40px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Care BI</h1>
        </td></tr>
        <tr><td style="padding: 40px;">
          ${emailContent}
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 30px;">
            <tr><td align="center">
              <a href="${loginLink}" style="display: inline-block; background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">Acessar Plataforma</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; color: #64748b; font-size: 14px;">© ${new Date().getFullYear()} Care BI. Todos os direitos reservados.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

      const { error: emailError } = await supabase.functions.invoke("send-email", {
        body: {
          to: inviteForm.email,
          subject: isExistingUser ? "Novo Acesso Concedido - Care BI" : "Bem-vindo ao Care BI - Suas credenciais de acesso",
          htmlContent: emailTemplate,
        },
      });

      if (emailError) {
        console.error("Error sending email:", emailError);
        if (!isExistingUser && temporaryPassword) {
          toast.success(`Usuário criado! Senha provisória: ${temporaryPassword} (e-mail não enviado)`);
        } else {
          toast.success("Usuário adicionado (e-mail não enviado)");
        }
      } else {
        toast.success(isExistingUser ? "Usuário vinculado e e-mail enviado!" : "Usuário criado e credenciais enviadas por e-mail!");
      }

      setDialogOpen(false);
      setInviteForm({ email: "", full_name: "", role: "user", plan: "starter" });
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Erro ao adicionar usuário");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveUser = async () => {
    if (!deleteUserId) return;
    setDeleting(true);

    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: {
          userId: deleteUserId,
          deleteFromAuth: deleteFromAuth,
        },
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || "Erro ao remover usuário");
      }

      toast.success(deleteFromAuth ? "Usuário excluído completamente" : "Usuário removido da empresa");
      setDeleteUserId(null);
      setDeleteFromAuth(false);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover usuário");
    } finally {
      setDeleting(false);
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
      <AlertDialog open={!!deleteUserId} onOpenChange={(open) => {
        if (!open) {
          setDeleteUserId(null);
          setDeleteFromAuth(false);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Usuário?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                O usuário será removido desta empresa e perderá acesso a todos os
                dashboards e grupos.
              </p>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="deleteFromAuth"
                  checked={deleteFromAuth}
                  onCheckedChange={(checked) => setDeleteFromAuth(checked === true)}
                />
                <label
                  htmlFor="deleteFromAuth"
                  className="text-sm font-medium leading-none cursor-pointer text-foreground"
                >
                  Excluir completamente (permitir novo cadastro com este e-mail)
                </label>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveUser}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Removendo..." : deleteFromAuth ? "Excluir Completamente" : "Remover da Empresa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
