import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, Plus, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Dashboard {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  company_id: string | null;
}

interface CompanyDashboardsManagerProps {
  companyId: string;
  companyName: string;
}

export function CompanyDashboardsManager({ companyId, companyName }: CompanyDashboardsManagerProps) {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [allDashboards, setAllDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDashboards, setSelectedDashboards] = useState<string[]>([]);
  const [removeDashboardId, setRemoveDashboardId] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboards();
  }, [companyId]);

  const fetchDashboards = async () => {
    setLoading(true);
    try {
      // Fetch dashboards for this company
      const { data: companyDashboards, error } = await supabase
        .from("dashboards")
        .select("id, name, description, category, company_id")
        .eq("company_id", companyId);

      if (error) throw error;
      setDashboards(companyDashboards || []);

      // Fetch all dashboards without company
      const { data: available, error: availableError } = await supabase
        .from("dashboards")
        .select("id, name, description, category, company_id")
        .is("company_id", null);

      if (availableError) throw availableError;
      setAllDashboards(available || []);
    } catch (error: any) {
      toast.error("Erro ao carregar dashboards");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignDashboards = async () => {
    if (selectedDashboards.length === 0) {
      toast.error("Selecione ao menos um dashboard");
      return;
    }

    try {
      const { error } = await supabase
        .from("dashboards")
        .update({ company_id: companyId })
        .in("id", selectedDashboards);

      if (error) throw error;

      toast.success("Dashboards atribuídos com sucesso");
      setDialogOpen(false);
      setSelectedDashboards([]);
      fetchDashboards();
    } catch (error: any) {
      toast.error("Erro ao atribuir dashboards");
    }
  };

  const handleRemoveDashboard = async () => {
    if (!removeDashboardId) return;

    try {
      const { error } = await supabase
        .from("dashboards")
        .update({ company_id: null })
        .eq("id", removeDashboardId);

      if (error) throw error;

      toast.success("Dashboard removido da empresa");
      setRemoveDashboardId(null);
      fetchDashboards();
    } catch (error: any) {
      toast.error("Erro ao remover dashboard");
    }
  };

  const toggleDashboardSelection = (dashboardId: string) => {
    setSelectedDashboards((prev) =>
      prev.includes(dashboardId)
        ? prev.filter((id) => id !== dashboardId)
        : [...prev, dashboardId]
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Dashboards de {companyName}</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie os dashboards disponíveis para esta empresa
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Atribuir Dashboard
        </Button>
      </div>

      {loading ? (
        <p className="text-center py-8 text-muted-foreground">Carregando...</p>
      ) : dashboards.length === 0 ? (
        <div className="text-center py-8 border rounded-lg">
          <LayoutDashboard className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Nenhum dashboard vinculado</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dashboard</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dashboards.map((dashboard) => (
              <TableRow key={dashboard.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4 text-primary" />
                    {dashboard.name}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {dashboard.description || "-"}
                </TableCell>
                <TableCell>
                  {dashboard.category ? (
                    <Badge variant="outline">{dashboard.category}</Badge>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setRemoveDashboardId(dashboard.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Assign Dashboard Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Atribuir Dashboards</DialogTitle>
            <DialogDescription>
              Selecione os dashboards que deseja atribuir à empresa
            </DialogDescription>
          </DialogHeader>
          
          {allDashboards.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Não há dashboards disponíveis para atribuir
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2">
              {allDashboards.map((dashboard) => (
                <div
                  key={dashboard.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 cursor-pointer"
                  onClick={() => toggleDashboardSelection(dashboard.id)}
                >
                  <Checkbox
                    checked={selectedDashboards.includes(dashboard.id)}
                    onCheckedChange={() => toggleDashboardSelection(dashboard.id)}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{dashboard.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {dashboard.description || "Sem descrição"}
                    </p>
                  </div>
                  {dashboard.category && (
                    <Badge variant="outline">{dashboard.category}</Badge>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAssignDashboards}
              disabled={selectedDashboards.length === 0}
            >
              Atribuir {selectedDashboards.length > 0 && `(${selectedDashboards.length})`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <AlertDialog open={!!removeDashboardId} onOpenChange={() => setRemoveDashboardId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Dashboard?</AlertDialogTitle>
            <AlertDialogDescription>
              O dashboard será removido desta empresa. Usuários da empresa perderão
              acesso a ele.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveDashboard}
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
