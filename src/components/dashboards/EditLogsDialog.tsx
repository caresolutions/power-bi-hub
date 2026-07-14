import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2 } from "lucide-react";

interface EditLogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  dashboard: "Dashboard",
  powerbi_report: "Relatório Power BI",
  user: "Usuário",
  user_group: "Grupo",
};

const ACTION_LABEL: Record<string, string> = {
  create: "Criação",
  update: "Edição",
  delete: "Exclusão",
  save: "Salvamento",
};

export function EditLogsDialog({ open, onOpenChange }: EditLogsDialogProps) {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      let query = supabase
        .from("edit_logs")
        .select("id, entity_type, entity_id, entity_name, action, user_email, created_at, details")
        .order("created_at", { ascending: false })
        .limit(300);
      if (filter !== "all") query = query.eq("entity_type", filter);
      const { data, error } = await query;
      if (!error) setLogs((data as any) || []);
      setLoading(false);
    })();
  }, [open, filter]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Histórico de edições</DialogTitle>
          <DialogDescription>
            Registro de alterações em dashboards, relatórios Power BI, usuários e grupos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 py-2">
          <span className="text-sm text-muted-foreground">Filtrar por tipo:</span>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[240px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="dashboard">Dashboard</SelectItem>
              <SelectItem value="powerbi_report">Relatório Power BI</SelectItem>
              <SelectItem value="user">Usuário</SelectItem>
              <SelectItem value="user_group">Grupo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-auto flex-1 border rounded-md">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Nenhum registro encontrado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data / hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Item</TableHead>
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
                    <TableCell className="max-w-[260px] truncate" title={log.entity_name ?? ""}>
                      {log.entity_name || <span className="text-muted-foreground">—</span>}
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
