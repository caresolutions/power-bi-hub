import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Users, Plus, Trash2, Edit2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Group {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  _count?: {
    members: number;
    dashboards: number;
  };
}

interface CompanyGroupsManagerProps {
  companyId: string;
  companyName: string;
}

export function CompanyGroupsManager({ companyId, companyName }: CompanyGroupsManagerProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  useEffect(() => {
    fetchGroups();
  }, [companyId]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const { data: groupsData, error } = await supabase
        .from("user_groups")
        .select("id, name, description, created_at")
        .eq("company_id", companyId);

      if (error) throw error;

      // Fetch counts for each group
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
    } catch (error: any) {
      toast.error("Erro ao carregar grupos");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error("Informe o nome do grupo");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      if (editingGroup) {
        const { error } = await supabase
          .from("user_groups")
          .update({
            name: formData.name,
            description: formData.description || null,
          })
          .eq("id", editingGroup.id);

        if (error) throw error;
        toast.success("Grupo atualizado");
      } else {
        const { error } = await supabase
          .from("user_groups")
          .insert({
            name: formData.name,
            description: formData.description || null,
            company_id: companyId,
            created_by: user.id,
          });

        if (error) throw error;
        toast.success("Grupo criado");
      }

      setDialogOpen(false);
      setEditingGroup(null);
      setFormData({ name: "", description: "" });
      fetchGroups();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar grupo");
    }
  };

  const handleEdit = (group: Group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteGroupId) return;

    try {
      // Delete group members first
      await supabase
        .from("user_group_members")
        .delete()
        .eq("group_id", deleteGroupId);

      // Delete group dashboard access
      await supabase
        .from("group_dashboard_access")
        .delete()
        .eq("group_id", deleteGroupId);

      // Delete the group
      const { error } = await supabase
        .from("user_groups")
        .delete()
        .eq("id", deleteGroupId);

      if (error) throw error;

      toast.success("Grupo excluído");
      setDeleteGroupId(null);
      fetchGroups();
    } catch (error: any) {
      toast.error("Erro ao excluir grupo");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Grupos de {companyName}</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie os grupos de usuários da empresa
          </p>
        </div>
        <Button onClick={() => {
          setEditingGroup(null);
          setFormData({ name: "", description: "" });
          setDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Grupo
        </Button>
      </div>

      {loading ? (
        <p className="text-center py-8 text-muted-foreground">Carregando...</p>
      ) : groups.length === 0 ? (
        <div className="text-center py-8 border rounded-lg">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Nenhum grupo criado</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Grupo</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-center">Membros</TableHead>
              <TableHead className="text-center">Dashboards</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => (
              <TableRow key={group.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    {group.name}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {group.description || "-"}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{group._count?.members || 0}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">{group._count?.dashboards || 0}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(group)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteGroupId(group.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          setEditingGroup(null);
          setFormData({ name: "", description: "" });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? "Editar Grupo" : "Novo Grupo"}
            </DialogTitle>
            <DialogDescription>
              {editingGroup
                ? "Atualize as informações do grupo"
                : "Crie um novo grupo para organizar usuários"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Grupo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ex: Equipe de Vendas"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Descrição opcional do grupo"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {editingGroup ? "Salvar" : "Criar Grupo"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteGroupId} onOpenChange={() => setDeleteGroupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Grupo?</AlertDialogTitle>
            <AlertDialogDescription>
              O grupo será excluído permanentemente junto com suas permissões de
              acesso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
