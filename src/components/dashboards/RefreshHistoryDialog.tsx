import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RefreshHistoryEntry {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  error_message: string | null;
  user_id: string;
}

interface RefreshHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboardId: string;
  dashboardName: string;
}

export function RefreshHistoryDialog({
  open,
  onOpenChange,
  dashboardId,
  dashboardName,
}: RefreshHistoryDialogProps) {
  const [history, setHistory] = useState<RefreshHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open, dashboardId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("dashboard_refresh_history")
        .select("*")
        .eq("dashboard_id", dashboardId)
        .order("started_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error fetching refresh history:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (startedAt: string, completedAt: string | null): string => {
    if (!completedAt) return "Em andamento...";
    
    const start = new Date(startedAt).getTime();
    const end = new Date(completedAt).getTime();
    const durationMs = end - start;
    
    if (durationMs < 1000) return `${durationMs}ms`;
    if (durationMs < 60000) return `${Math.round(durationMs / 1000)}s`;
    
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.round((durationMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "pending":
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Concluído";
      case "failed":
        return "Falhou";
      case "pending":
        return "Em andamento";
      default:
        return status;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Atualizações - {dashboardName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Carregando histórico...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma atualização registrada ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="border border-border rounded-lg p-4 bg-card"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(entry.status)}
                      <span className="font-medium">{getStatusLabel(entry.status)}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDuration(entry.started_at, entry.completed_at)}
                    </span>
                  </div>
                  
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Início: </span>
                      <span>
                        {format(new Date(entry.started_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                      </span>
                    </div>
                    {entry.completed_at && (
                      <div>
                        <span className="text-muted-foreground">Fim: </span>
                        <span>
                          {format(new Date(entry.completed_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                  </div>

                  {entry.error_message && (
                    <div className="mt-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
                      {entry.error_message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
