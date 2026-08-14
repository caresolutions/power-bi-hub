import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Lock, Users, User } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PageRestrictionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboardId: string;
  pageName: string;
  pageDisplayName: string;
  pageVisibilityId?: string;
  /** Used to upsert the visibility row if it doesn't exist yet */
  ensureVisibilityRow: () => Promise<string | null>;
  companyId: string;
}

type Mode = "all" | "restricted" | "hidden";

interface CompanyUser {
  id: string;
  full_name: string | null;
  email: string;
}

interface CompanyGroup {
  id: string;
  name: string;
}

export const PageRestrictionsDialog = ({
  open,
  onOpenChange,
  pageName,
  pageDisplayName,
  pageVisibilityId,
  ensureVisibilityRow,
  companyId,
}: PageRestrictionsDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<Mode>("all");
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [groups, setGroups] = useState<CompanyGroup[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, pageVisibilityId, companyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load company users (excluding admins/master_admins from list - they always see all)
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("full_name");

      // Filter only role = 'user'
      const userIds = (profilesData || []).map((p) => p.id);
      let regularUsers: CompanyUser[] = [];
      if (userIds.length > 0) {
        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", userIds);
        const roleMap = new Map((rolesData || []).map((r: any) => [r.user_id, r.role]));
        regularUsers = (profilesData || []).filter(
          (p) => roleMap.get(p.id) === "user"
        );
      }
      setUsers(regularUsers);

      // Load company groups
      const { data: groupsData } = await supabase
        .from("user_groups")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name");
      setGroups(groupsData || []);

      // Load existing restrictions
      if (pageVisibilityId) {
        const [{ data: userR }, { data: groupR }] = await Promise.all([
          supabase
            .from("dashboard_page_user_restrictions")
            .select("user_id")
            .eq("page_visibility_id", pageVisibilityId),
          supabase
            .from("dashboard_page_group_restrictions")
            .select("group_id")
            .eq("page_visibility_id", pageVisibilityId),
        ]);

        const uSet = new Set((userR || []).map((r) => r.user_id));
        const gSet = new Set((groupR || []).map((r) => r.group_id));
        setSelectedUsers(uSet);
        setSelectedGroups(gSet);
        setMode(uSet.size > 0 || gSet.size > 0 ? "restricted" : "all");
      } else {
        setSelectedUsers(new Set());
        setSelectedGroups(new Set());
        setMode("all");
      }
    } catch (error: any) {
      console.error("Error loading restrictions:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (id: string) => {
    setSelectedUsers((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleGroup = (id: string) => {
    setSelectedGroups((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      // Ensure visibility row exists
      const pvId = pageVisibilityId || (await ensureVisibilityRow());
      if (!pvId) throw new Error("Falha ao registrar a página");

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // Wipe existing
      await Promise.all([
        supabase
          .from("dashboard_page_user_restrictions")
          .delete()
          .eq("page_visibility_id", pvId),
        supabase
          .from("dashboard_page_group_restrictions")
          .delete()
          .eq("page_visibility_id", pvId),
      ]);

      if (mode === "restricted") {
        const userRows = Array.from(selectedUsers).map((uid) => ({
          page_visibility_id: pvId,
          user_id: uid,
          granted_by: user.id,
        }));
        const groupRows = Array.from(selectedGroups).map((gid) => ({
          page_visibility_id: pvId,
          group_id: gid,
          granted_by: user.id,
        }));

        if (userRows.length > 0) {
          const { error } = await supabase
            .from("dashboard_page_user_restrictions")
            .insert(userRows);
          if (error) throw error;
        }
        if (groupRows.length > 0) {
          const { error } = await supabase
            .from("dashboard_page_group_restrictions")
            .insert(groupRows);
          if (error) throw error;
        }
      }

      toast({
        title: "Sucesso",
        description: "Restrições salvas",
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving restrictions:", error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao salvar",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const restrictedCount = selectedUsers.size + selectedGroups.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Quem pode ver: {pageDisplayName}
          </DialogTitle>
          <DialogDescription>
            Defina quais usuários ou grupos têm acesso a esta página.
            Administradores sempre veem todas as páginas.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="r-all" />
                <Label htmlFor="r-all" className="cursor-pointer font-normal">
                  Visível para todos com acesso ao dashboard
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="restricted" id="r-restricted" />
                <Label htmlFor="r-restricted" className="cursor-pointer font-normal">
                  Restringir acesso{" "}
                  {mode === "restricted" && restrictedCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({restrictedCount} selecionado{restrictedCount > 1 ? "s" : ""})
                    </span>
                  )}
                </Label>
              </div>
            </RadioGroup>

            {mode === "restricted" && (
              <Tabs defaultValue="groups">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="groups" className="gap-2">
                    <Users className="h-3 w-3" /> Grupos ({selectedGroups.size})
                  </TabsTrigger>
                  <TabsTrigger value="users" className="gap-2">
                    <User className="h-3 w-3" /> Usuários ({selectedUsers.size})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="groups">
                  <div className="space-y-1 max-h-[260px] overflow-auto border rounded-md p-2">
                    {groups.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-3 text-center">
                        Nenhum grupo cadastrado
                      </p>
                    ) : (
                      groups.map((g) => (
                        <label
                          key={g.id}
                          className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedGroups.has(g.id)}
                            onCheckedChange={() => toggleGroup(g.id)}
                          />
                          <span className="text-sm">{g.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="users">
                  <div className="space-y-1 max-h-[260px] overflow-auto border rounded-md p-2">
                    {users.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-3 text-center">
                        Nenhum usuário cadastrado
                      </p>
                    ) : (
                      users.map((u) => (
                        <label
                          key={u.id}
                          className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedUsers.has(u.id)}
                            onCheckedChange={() => toggleUser(u.id)}
                          />
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {u.full_name || u.email}
                            </span>
                            {u.full_name && (
                              <span className="text-xs text-muted-foreground">
                                {u.email}
                              </span>
                            )}
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
