import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { Users, Pencil, Save, Shield, User, Trash2, Download, UserCheck, UserX, KeyRound } from "lucide-react";

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
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
  const [resettingUser, setResettingUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", role: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
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

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name, is_active")
      .eq("company_id", targetCompanyId);

    if (profiles) {
      const usersWithRoles: UserProfile[] = [];
      
      for (const p of profiles) {
        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", p.id);
        
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
        title: t('common.error'),
        description: t('settings.userStatusError'),
        variant: "destructive",
      });
      return;
    }

    toast({
      title: t('common.success'),
      description: newActiveState ? t('settings.userActivated') : t('settings.userDeactivated'),
    });
    
    fetchUsers();
  };

  const handleSave = async () => {
    if (!editingUser) return;
    
    setSaving(true);
    
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ full_name: editForm.full_name })
      .eq("id", editingUser.id);

    if (profileError) {
      toast({
        title: t('common.error'),
        description: t('settings.profileUpdateError'),
        variant: "destructive",
      });
      setSaving(false);
      return;
    }

    if (editForm.role !== editingUser.role) {
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", editingUser.id);

      if (deleteError) {
        console.error("Error deleting roles:", deleteError);
        toast({
          title: t('common.error'),
          description: t('settings.roleUpdateError'),
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ 
          user_id: editingUser.id, 
          role: editForm.role as 'admin' | 'user' | 'master_admin' 
        });

      if (roleError) {
        console.error("Error inserting role:", roleError);
        toast({
          title: t('common.error'),
          description: t('settings.roleUpdateError') + ": " + roleError.message,
          variant: "destructive",
        });
        setSaving(false);
        return;
      }
    }

    toast({
      title: t('common.success'),
      description: t('settings.userUpdated'),
    });
    
    setEditingUser(null);
    setSaving(false);
    fetchUsers();
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    
    setDeleting(true);
    
    await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", deletingUser.id);

    await supabase
      .from("user_dashboard_access")
      .delete()
      .eq("user_id", deletingUser.id);

    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", deletingUser.id);

    if (error) {
      toast({
        title: t('common.error'),
        description: t('settings.userRemoveError'),
        variant: "destructive",
      });
    } else {
      toast({
        title: t('common.success'),
        description: t('settings.userRemoved'),
      });
    }
    
    setDeletingUser(null);
    setDeleting(false);
    fetchUsers();
  };

  const handleResetPassword = async () => {
    if (!resettingUser) return;
    
    setResettingPassword(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("reset-user-password", {
        body: { targetUserId: resettingUser.id },
      });

      if (response.error) throw response.error;
      
      const result = response.data;
      if (!result.success) throw new Error(result.error);

      toast({
        title: t('common.success'),
        description: t('settings.passwordResetSent'),
      });
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast({
        title: t('common.error'),
        description: t('settings.passwordResetError'),
        variant: "destructive",
      });
    }
    
    setResettingUser(null);
    setResettingPassword(false);
  };

  const handleExport = () => {
    let filteredUsers = users;
    
    if (exportFilter === "active") {
      filteredUsers = users.filter(u => u.is_active);
    } else if (exportFilter === "inactive") {
      filteredUsers = users.filter(u => !u.is_active);
    }

    const headers = [t('settings.name'), t('settings.email'), t('settings.role'), t('settings.status')];
    const getRoleName = (role: string) => {
      if (role === 'master_admin') return 'Master Admin';
      if (role === 'admin') return 'Admin';
      return t('roles.user');
    };
    const rows = filteredUsers.map(user => [
      user.full_name || "-",
      user.email,
      getRoleName(user.role),
      user.is_active ? t('settings.active') : t('settings.inactive')
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `usuarios_${exportFilter}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: t('settings.exportComplete'),
      description: t('settings.usersExported', { count: filteredUsers.length }),
    });
  };

  if (loading) {
    return <div className="text-muted-foreground">{t('common.loading')}</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>{t('settings.companyUsers')}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Select value={exportFilter} onValueChange={(v) => setExportFilter(v as "all" | "active" | "inactive")}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('settings.all')}</SelectItem>
                  <SelectItem value="active">{t('settings.activeOnly')}</SelectItem>
                  <SelectItem value="inactive">{t('settings.inactiveOnly')}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                {t('settings.export')}
              </Button>
            </div>
          </div>
          <CardDescription>
            {t('settings.companyUsersDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-muted-foreground">{t('settings.noUsers')}</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('settings.name')}</TableHead>
                    <TableHead>{t('settings.email')}</TableHead>
                    <TableHead>{t('settings.role')}</TableHead>
                    <TableHead>{t('settings.status')}</TableHead>
                    <TableHead className="w-[150px]">{t('settings.actions')}</TableHead>
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
                            {user.role === 'master_admin' ? 'Master Admin' : user.role === 'admin' ? 'Admin' : t('roles.user')}
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
                            {user.is_active ? t('settings.active') : t('settings.inactive')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {user.id !== currentUserId && (
                            <Switch
                              checked={user.is_active}
                              onCheckedChange={() => handleToggleActive(user)}
                              title={user.is_active ? t('settings.deactivate') : t('settings.activate')}
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
                              onClick={() => setResettingUser(user)}
                              title={t('settings.resetPassword')}
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                          )}
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
            <DialogTitle>{t('settings.editUser')}</DialogTitle>
            <DialogDescription>
              {t('settings.editUserDesc')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('settings.email')}</Label>
              <Input value={editingUser?.email || ""} disabled />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t('settings.fullName')}</Label>
              <Input
                id="edit-name"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                placeholder={t('settings.userNamePlaceholder')}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-role">{t('settings.role')}</Label>
              <Select
                value={editForm.role}
                onValueChange={(value) => setEditForm({ ...editForm, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('settings.selectRole')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="master_admin">Master Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">{t('roles.user')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? t('settings.saving') : t('common.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.removeUser')}</AlertDialogTitle>
            <AlertDialogDescription>
              <span dangerouslySetInnerHTML={{ 
                __html: t('settings.removeUserConfirm', { email: deletingUser?.email }) 
              }} />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? t('settings.removing') : t('settings.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Confirmation Dialog */}
      <AlertDialog open={!!resettingUser} onOpenChange={() => setResettingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.resetPassword')}</AlertDialogTitle>
            <AlertDialogDescription>
              <span dangerouslySetInnerHTML={{ 
                __html: t('settings.resetPasswordConfirm', { email: resettingUser?.email }) 
              }} />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetPassword}
              disabled={resettingPassword}
            >
              <KeyRound className="mr-2 h-4 w-4" />
              {resettingPassword ? t('settings.resettingPassword') : t('settings.confirmResetPassword')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};