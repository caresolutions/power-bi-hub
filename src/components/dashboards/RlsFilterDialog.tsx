import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";

interface CompanyUser {
  id: string;
  email: string;
  full_name: string | null;
}

interface UserValue {
  id: string;
  user_id: string;
  filter_value: string;
}

interface Props {
  dashboardId: string;
  dashboardName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Apenas letras, números, espaço, underline e hífen — sem caracteres especiais
const sanitizeName = (value: string) =>
  value.replace(/[^A-Za-z0-9 _-]/g, "").slice(0, 100);

export function RlsFilterDialog({ dashboardId, dashboardName, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isActive, setIsActive] = useState(false);
  const [tableName, setTableName] = useState("");
  const [columnName, setColumnName] = useState("");
  const [useEmail, setUseEmail] = useState(true);
  const [exemptAdmins, setExemptAdmins] = useState(true);

  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [values, setValues] = useState<UserValue[]>([]);
  const [newUserId, setNewUserId] = useState("");
  const [newValue, setNewValue] = useState("");

  useEffect(() => {
    if (!open) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dashboardId]);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: config }, { data: vals }, { data: dash }] = await Promise.all([
        supabase.from("dashboard_rls_filters").select("*").eq("dashboard_id", dashboardId).maybeSingle(),
        supabase.from("dashboard_rls_user_values").select("id, user_id, filter_value").eq("dashboard_id", dashboardId),
        supabase.from("dashboards").select("company_id").eq("id", dashboardId).maybeSingle(),
      ]);

      if (config) {
        setIsActive(config.is_active);
        setTableName(config.table_name);
        setColumnName(config.column_name);
        setUseEmail(config.use_email);
        setExemptAdmins(config.exempt_admins);
      } else {
        setIsActive(false);
        setTableName("");
        setColumnName("");
        setUseEmail(true);
        setExemptAdmins(true);
      }

      setValues(vals || []);

      if (dash?.company_id) {
        const { data: companyUsers } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .eq("company_id", dash.company_id)
          .order("email");
        setUsers(companyUsers || []);
      } else {
        setUsers([]);
      }
    } catch (error: any) {
      toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (isActive && (!tableName.trim() || !columnName.trim())) {
      toast({
        title: "Dados incompletos",
        description: "Informe o nome da tabela e o nome da coluna.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("dashboard_rls_filters").upsert(
        {
          dashboard_id: dashboardId,
          table_name: tableName.trim(),
          column_name: columnName.trim(),
          use_email: useEmail,
          exempt_admins: exemptAdmins,
          is_active: isActive,
          created_by: user?.id ?? null,
        },
        { onConflict: "dashboard_id" }
      );
      if (error) throw error;

      toast({ title: "Filtro salvo", description: "As regras foram aplicadas a este dashboard." });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddValue = async () => {
    if (!newUserId || !newValue.trim()) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("dashboard_rls_user_values")
        .insert({
          dashboard_id: dashboardId,
          user_id: newUserId,
          filter_value: newValue.trim(),
          created_by: user?.id ?? null,
        })
        .select("id, user_id, filter_value")
        .single();
      if (error) throw error;
      setValues((prev) => [...prev, data]);
      setNewValue("");
    } catch (error: any) {
      toast({ title: "Erro ao adicionar", description: error.message, variant: "destructive" });
    }
  };

  const handleRemoveValue = async (valueId: string) => {
    try {
      const { error } = await supabase.from("dashboard_rls_user_values").delete().eq("id", valueId);
      if (error) throw error;
      setValues((prev) => prev.filter((v) => v.id !== valueId));
    } catch (error: any) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    }
  };

  const userLabel = (userId: string) => {
    const u = users.find((x) => x.id === userId);
    return u ? u.full_name || u.email : userId;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Segurança por linha — {dashboardName}
          </DialogTitle>
          <DialogDescription>
            Restringe os dados que cada pessoa enxerga neste dashboard, comparando uma coluna do
            relatório com o e-mail de quem acessa (e/ou com valores definidos por usuário).
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div>
                <Label className="text-sm font-medium">Ativar restrição</Label>
                <p className="text-xs text-muted-foreground">
                  Quando desligado, todos veem os dados completos.
                </p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rls-table">Tabela</Label>
                <Input
                  id="rls-table"
                  placeholder="tb_cad_empresa"
                  value={tableName}
                  onChange={(e) => setTableName(sanitizeName(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">Nome exato da tabela no relatório.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rls-column">Coluna</Label>
                <Input
                  id="rls-column"
                  placeholder="email"
                  value={columnName}
                  onChange={(e) => setColumnName(sanitizeName(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">Nome exato da coluna a comparar.</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                <div>
                  <Label className="text-sm font-medium">Usar o e-mail de quem acessa</Label>
                  <p className="text-xs text-muted-foreground">
                    O valor do e-mail do login é comparado com a coluna informada.
                  </p>
                </div>
                <Switch checked={useEmail} onCheckedChange={setUseEmail} />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                <div>
                  <Label className="text-sm font-medium">Administradores veem tudo</Label>
                  <p className="text-xs text-muted-foreground">
                    Administradores não são filtrados.
                  </p>
                </div>
                <Switch checked={exemptAdmins} onCheckedChange={setExemptAdmins} />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Valores por usuário (opcional)</Label>
                <p className="text-xs text-muted-foreground">
                  Além do e-mail, você pode liberar valores específicos para cada pessoa (ex.: nome da
                  empresa, região). Vários valores por usuário são permitidos.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Select value={newUserId} onValueChange={setNewUserId}>
                  <SelectTrigger className="sm:w-[240px]">
                    <SelectValue placeholder="Selecione o usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Valor liberado"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleAddValue();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={handleAddValue} disabled={!newUserId || !newValue.trim()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar
                </Button>
              </div>

              {values.length > 0 ? (
                <div className="space-y-2">
                  {values.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{userLabel(v.user_id)}</span>
                        <Badge variant="secondary">{v.filter_value}</Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleRemoveValue(v.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhum valor cadastrado.</p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RlsFilterDialog;
