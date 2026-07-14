import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2 } from "lucide-react";

interface EditLogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboardId: string;
  dashboardName?: string;
}

type LogRow = {
  id: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  action: string;
  user_email: string | null;
  created_at: string;
  details: any;
};

const ENTITY_LABEL: Record<string, string> = {
  dashboard: "Cadastro do Dashboard",
  powerbi_report: "Relatório Power BI",
};

const ACTION_LABEL: Record<string, string> = {
  create: "Criação",
  update: "Edição",
  delete: "Exclusão",
  save: "Salvamento",
};

export function EditLogsDialog({ open, onOpenChange, dashboardId, dashboardName }: EditLogsDialogProps) {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !dashboardId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("edit_logs")
        .select("id, entity_type, entity_id, entity_name, action, user_email, created_at, details")
        .in("entity_type", ["dashboard", "powerbi_report"])
        .eq("entity_id", dashboardId)
        .order("created_at", { ascending: false })
        .limit(300);
      if (!error) setLogs((data as any) || []);
      setLoading(false);
    })();
  }, [open, dashboardId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Histórico de edições</DialogTitle>
          <DialogDescription>
            {dashboardName ? `Alterações registradas para: ${dashboardName}` : "Alterações registradas neste dashboard."}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-auto flex-1 border rounded-md">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Nenhum registro encontrado para este dashboard.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data / hora</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Usuário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{ENTITY_LABEL[log.entity_type] ?? log.entity_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ACTION_LABEL[log.action] ?? log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.user_email || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
