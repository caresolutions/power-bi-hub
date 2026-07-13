import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { CalendarClock, Loader2, Plus, Trash2, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Schedule {
  id: string;
  dashboard_id: string;
  frequency: "daily" | "weekly" | "monthly";
  time_of_day: string;
  timezone: string;
  days_of_week: number[] | null;
  day_of_month: number | null;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
}

interface RefreshScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboardId: string;
  dashboardName: string;
  companyId: string | null;
}

const WEEKDAYS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

const TIMEZONES = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Bahia",
  "America/Belem",
  "America/Fortaleza",
  "UTC",
];

export function RefreshScheduleDialog({
  open,
  onOpenChange,
  dashboardId,
  dashboardName,
  companyId,
}: RefreshScheduleDialogProps) {
  const { userId } = useAuth();
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pbiSchedule, setPbiSchedule] = useState<any>(null);
  const [pbiHistory, setPbiHistory] = useState<any[]>([]);
  const [pbiLoading, setPbiLoading] = useState(false);

  // Draft new schedule form
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("daily");
  const [timeOfDay, setTimeOfDay] = useState("06:00");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);
  const [dayOfMonth, setDayOfMonth] = useState(1);

  useEffect(() => {
    if (open) {
      fetchSchedules();
      fetchPowerBISchedule();
    }
  }, [open, dashboardId]);

  const fetchPowerBISchedule = async () => {
    setPbiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-powerbi-schedule", {
        body: { dashboardId },
      });
      if (error) throw error;
      if (data?.success) {
        setPbiSchedule(data.schedule);
        setPbiHistory(data.history ?? []);
      }
    } catch (err) {
      console.error("PBI schedule fetch failed", err);
    } finally {
      setPbiLoading(false);
    }
  };

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("dashboard_refresh_schedules")
        .select("*")
        .eq("dashboard_id", dashboardId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setSchedules((data ?? []) as Schedule[]);
    } catch (err) {
      console.error(err);
      toast({ title: "Erro", description: "Não foi possível carregar os agendamentos.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!userId) return;
    if (frequency === "weekly" && daysOfWeek.length === 0) {
      toast({ title: "Selecione os dias da semana", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("dashboard_refresh_schedules").insert({
        dashboard_id: dashboardId,
        company_id: companyId,
        created_by: userId,
        frequency,
        time_of_day: timeOfDay + ":00",
        timezone,
        days_of_week: frequency === "weekly" ? daysOfWeek : [],
        day_of_month: frequency === "monthly" ? dayOfMonth : null,
        is_active: true,
      });
      if (error) throw error;
      toast({ title: "Agendamento criado" });
      await fetchSchedules();
    } catch (err: any) {
      toast({ title: "Erro ao criar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (s: Schedule) => {
    const { error } = await supabase
      .from("dashboard_refresh_schedules")
      .update({ is_active: !s.is_active })
      .eq("id", s.id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else fetchSchedules();
  };

  const removeSchedule = async (id: string) => {
    if (!confirm("Remover este agendamento?")) return;
    const { error } = await supabase.from("dashboard_refresh_schedules").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else fetchSchedules();
  };

  const describeSchedule = (s: Schedule) => {
    const time = s.time_of_day.slice(0, 5);
    if (s.frequency === "daily") return `Todos os dias às ${time}`;
    if (s.frequency === "weekly") {
      const labels = (s.days_of_week ?? []).map((d) => WEEKDAYS.find((w) => w.value === d)?.label).filter(Boolean);
      return `${labels.join(", ") || "—"} às ${time}`;
    }
    return `Dia ${s.day_of_month ?? "?"} do mês às ${time}`;
  };

  const toggleDay = (d: number) => {
    setDaysOfWeek((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Agendamento de Atualização
          </DialogTitle>
          <DialogDescription>{dashboardName}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-6">
          {/* Existing schedules */}
          <section className="space-y-2">
            <h3 className="text-sm font-medium">Agendamentos ativos</h3>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : schedules.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum agendamento configurado ainda.</p>
            ) : (
              <div className="space-y-2">
                {schedules.map((s) => (
                  <div key={s.id} className="border border-border rounded-lg p-3 bg-card flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{describeSchedule(s)}</p>
                      <p className="text-xs text-muted-foreground">Fuso: {s.timezone}</p>
                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Próxima:{" "}
                          {s.next_run_at
                            ? format(new Date(s.next_run_at), "dd/MM HH:mm", { locale: ptBR })
                            : "aguardando"}
                        </span>
                        {s.last_run_at && (
                          <span>
                            Última: {format(new Date(s.last_run_at), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={s.is_active} onCheckedChange={() => toggleActive(s)} />
                      <Button variant="ghost" size="icon" onClick={() => removeSchedule(s.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* New schedule form */}
          <section className="space-y-3 border-t border-border pt-4">
            <h3 className="text-sm font-medium">Novo agendamento</h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Frequência</Label>
                <Select value={frequency} onValueChange={(v) => setFrequency(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diário</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Horário</Label>
                <Input type="time" value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Fuso horário</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {frequency === "weekly" && (
              <div className="space-y-1">
                <Label>Dias da semana</Label>
                <div className="flex flex-wrap gap-1">
                  {WEEKDAYS.map((d) => (
                    <Button
                      key={d.value}
                      type="button"
                      variant={daysOfWeek.includes(d.value) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleDay(d.value)}
                      className="h-8 px-3"
                    >
                      {d.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {frequency === "monthly" && (
              <div className="space-y-1">
                <Label>Dia do mês (1 a 28)</Label>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(Math.min(28, Math.max(1, parseInt(e.target.value) || 1)))}
                />
              </div>
            )}

            <Button onClick={handleAdd} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Adicionar agendamento
            </Button>

            <p className="text-xs text-muted-foreground">
              Lembre-se dos limites do Power BI: 8 refreshes/dia no Pro e 48/dia no Premium.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
