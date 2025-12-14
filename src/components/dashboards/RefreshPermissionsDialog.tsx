import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, RefreshCw } from "lucide-react";

interface User {
  id: string;
  email: string;
  full_name: string | null;
}

interface RefreshPermission {
  user_id: string;
}

interface RefreshPermissionsDialogProps {
  dashboardId: string;
  dashboardName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RefreshPermissionsDialog = ({
  dashboardId,
  dashboardName,
  open,
  onOpenChange,
}: RefreshPermissionsDialogProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, dashboardId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's company_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) return;

      // Fetch all users in the company (excluding admins since they may have access by default)
      const { data: companyUsers, error: usersError } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("company_id", profile.company_id);

      if (usersError) throw usersError;

      setUsers(companyUsers || []);

      // Fetch current refresh permissions for this dashboard
      const { data: perms, error: permsError } = await supabase
        .from("user_dashboard_refresh_permissions")
        .select("user_id")
        .eq("dashboard_id", dashboardId);

      if (permsError) throw permsError;

      const permSet = new Set((perms || []).map((p: RefreshPermission) => p.user_id));
      setPermissions(permSet);
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

  const handleTogglePermission = (userId: string) => {
    setPermissions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current permissions
      const { data: currentPerms } = await supabase
        .from("user_dashboard_refresh_permissions")
        .select("user_id")
        .eq("dashboard_id", dashboardId);

      const currentSet = new Set((currentPerms || []).map((p: RefreshPermission) => p.user_id));

      // Find users to add
      const toAdd = [...permissions].filter((userId) => !currentSet.has(userId));
      
      // Find users to remove
      const toRemove = [...currentSet].filter((userId) => !permissions.has(userId));

      // Add new permissions
      if (toAdd.length > 0) {
        const { error: insertError } = await supabase
          .from("user_dashboard_refresh_permissions")
          .insert(
            toAdd.map((userId) => ({
              user_id: userId,
              dashboard_id: dashboardId,
              granted_by: user.id,
            }))
          );

        if (insertError) throw insertError;
      }

      // Remove revoked permissions
      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from("user_dashboard_refresh_permissions")
          .delete()
          .eq("dashboard_id", dashboardId)
          .in("user_id", toRemove);

        if (deleteError) throw deleteError;
      }

      toast({
        title: "Sucesso",
        description: "Permissões de atualização salvas",
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Permissões de Atualização
          </DialogTitle>
          <DialogDescription>
            Selecione quais usuários podem atualizar o dataset do dashboard "{dashboardName}"
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            Nenhum usuário encontrado na empresa.
          </p>
        ) : (
          <div className="space-y-4 max-h-[300px] overflow-y-auto">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/5 transition-colors"
              >
                <Checkbox
                  id={`user-${u.id}`}
                  checked={permissions.has(u.id)}
                  onCheckedChange={() => handleTogglePermission(u.id)}
                />
                <label
                  htmlFor={`user-${u.id}`}
                  className="flex-1 cursor-pointer"
                >
                  <p className="font-medium text-sm">
                    {u.full_name || "Sem nome"}
                  </p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </label>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex-1"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RefreshPermissionsDialog;
