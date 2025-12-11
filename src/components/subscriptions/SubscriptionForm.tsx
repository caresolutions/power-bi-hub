import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save, X, Plus, Trash2 } from "lucide-react";

interface Recipient {
  email: string;
  name: string;
  apply_rls: boolean;
}

interface SubscriptionFormProps {
  dashboardId: string;
  subscription?: {
    id: string;
    name: string;
    export_format: string;
    frequency: string;
    schedule_time: string;
    schedule_days_of_week: number[] | null;
    schedule_day_of_month: number | null;
    schedule_interval_hours: number | null;
    report_page: string | null;
    recipients: { email: string; name: string | null }[];
  } | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

export const SubscriptionForm = ({
  dashboardId,
  subscription,
  onSuccess,
  onCancel,
}: SubscriptionFormProps) => {
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: subscription?.name || "",
    export_format: subscription?.export_format || "pdf",
    frequency: subscription?.frequency || "daily",
    schedule_time: subscription?.schedule_time?.substring(0, 5) || "08:00",
    schedule_days_of_week: subscription?.schedule_days_of_week || [1, 2, 3, 4, 5],
    schedule_day_of_month: subscription?.schedule_day_of_month || 1,
    schedule_interval_hours: subscription?.schedule_interval_hours || 6,
    report_page: subscription?.report_page || "",
  });
  const [recipients, setRecipients] = useState<Recipient[]>(
    subscription?.recipients?.map(r => ({
      email: r.email,
      name: r.name || "",
      apply_rls: false,
    })) || [{ email: "", name: "", apply_rls: false }]
  );
  const { toast } = useToast();

  useEffect(() => {
    fetchCompanyId();
  }, []);

  const fetchCompanyId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (profile?.company_id) {
      setCompanyId(profile.company_id);
    }
  };

  const handleDayToggle = (day: number) => {
    setForm(prev => ({
      ...prev,
      schedule_days_of_week: prev.schedule_days_of_week.includes(day)
        ? prev.schedule_days_of_week.filter(d => d !== day)
        : [...prev.schedule_days_of_week, day].sort(),
    }));
  };

  const addRecipient = () => {
    setRecipients([...recipients, { email: "", name: "", apply_rls: false }]);
  };

  const removeRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const updateRecipient = (index: number, field: keyof Recipient, value: string | boolean) => {
    const updated = [...recipients];
    updated[index] = { ...updated[index], [field]: value };
    setRecipients(updated);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome da assinatura é obrigatório",
        variant: "destructive",
      });
      return;
    }

    const validRecipients = recipients.filter(r => r.email.trim());
    if (validRecipients.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos um destinatário",
        variant: "destructive",
      });
      return;
    }

    if (!companyId) {
      toast({
        title: "Erro",
        description: "Empresa não encontrada",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const subscriptionData = {
      dashboard_id: dashboardId,
      company_id: companyId,
      created_by: user.id,
      name: form.name.trim(),
      export_format: form.export_format as "pdf" | "pptx",
      frequency: form.frequency as "once" | "daily" | "weekly" | "monthly" | "interval",
      schedule_time: form.schedule_time + ":00",
      schedule_days_of_week: form.frequency === "weekly" ? form.schedule_days_of_week : null,
      schedule_day_of_month: form.frequency === "monthly" ? form.schedule_day_of_month : null,
      schedule_interval_hours: form.frequency === "interval" ? form.schedule_interval_hours : null,
      report_page: form.report_page.trim() || null,
    };

    try {
      let subscriptionId: string;

      if (subscription) {
        // Update existing
        const { error } = await supabase
          .from("report_subscriptions")
          .update(subscriptionData)
          .eq("id", subscription.id);

        if (error) throw error;
        subscriptionId = subscription.id;

        // Delete existing recipients
        await supabase
          .from("subscription_recipients")
          .delete()
          .eq("subscription_id", subscription.id);
      } else {
        // Create new
        const { data, error } = await supabase
          .from("report_subscriptions")
          .insert(subscriptionData)
          .select("id")
          .single();

        if (error) throw error;
        subscriptionId = data.id;
      }

      // Insert recipients
      const recipientData = validRecipients.map(r => ({
        subscription_id: subscriptionId,
        email: r.email.trim(),
        name: r.name.trim() || null,
        apply_rls: r.apply_rls,
      }));

      const { error: recipientError } = await supabase
        .from("subscription_recipients")
        .insert(recipientData);

      if (recipientError) throw recipientError;

      toast({
        title: "Sucesso",
        description: subscription ? "Assinatura atualizada" : "Assinatura criada com sucesso",
      });
      onSuccess();
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
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>{subscription ? "Editar Assinatura" : "Nova Assinatura de Relatório"}</CardTitle>
        <CardDescription>
          Configure o envio automático de relatórios por email
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Info */}
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Assinatura *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Relatório Semanal de Vendas"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="format">Formato de Exportação</Label>
              <Select
                value={form.export_format}
                onValueChange={(v) => setForm({ ...form, export_format: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="pptx">PowerPoint (PPTX)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="page">Página do Relatório (opcional)</Label>
              <Input
                id="page"
                value={form.report_page}
                onChange={(e) => setForm({ ...form, report_page: e.target.value })}
                placeholder="Deixe vazio para todas"
              />
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="space-y-4">
          <h3 className="font-semibold">Agendamento</h3>
          
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Frequência</Label>
              <Select
                value={form.frequency}
                onValueChange={(v) => setForm({ ...form, frequency: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Uma vez</SelectItem>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="interval">Por Intervalo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.frequency !== "interval" && (
              <div className="space-y-2">
                <Label>Horário de Envio</Label>
                <Input
                  type="time"
                  value={form.schedule_time}
                  onChange={(e) => setForm({ ...form, schedule_time: e.target.value })}
                />
              </div>
            )}
          </div>

          {form.frequency === "weekly" && (
            <div className="space-y-2">
              <Label>Dias da Semana</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <Button
                    key={day.value}
                    type="button"
                    variant={form.schedule_days_of_week.includes(day.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleDayToggle(day.value)}
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {form.frequency === "monthly" && (
            <div className="space-y-2">
              <Label>Dia do Mês</Label>
              <Select
                value={String(form.schedule_day_of_month)}
                onValueChange={(v) => setForm({ ...form, schedule_day_of_month: parseInt(v) })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={String(day)}>
                      Dia {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {form.frequency === "interval" && (
            <div className="space-y-2">
              <Label>Intervalo em Horas</Label>
              <Select
                value={String(form.schedule_interval_hours)}
                onValueChange={(v) => setForm({ ...form, schedule_interval_hours: parseInt(v) })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 6, 8, 12, 24].map((hours) => (
                    <SelectItem key={hours} value={String(hours)}>
                      A cada {hours}h
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Recipients */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Destinatários</h3>
            <Button type="button" variant="outline" size="sm" onClick={addRecipient}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar
            </Button>
          </div>

          <div className="space-y-3">
            {recipients.map((recipient, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card/50">
                <div className="flex-1 grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Email *</Label>
                    <Input
                      type="email"
                      value={recipient.email}
                      onChange={(e) => updateRecipient(index, "email", e.target.value)}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Nome (opcional)</Label>
                    <Input
                      value={recipient.name}
                      onChange={(e) => updateRecipient(index, "name", e.target.value)}
                      placeholder="Nome do destinatário"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`rls-${index}`}
                      checked={recipient.apply_rls}
                      onCheckedChange={(checked) => updateRecipient(index, "apply_rls", !!checked)}
                    />
                    <Label htmlFor={`rls-${index}`} className="text-xs">
                      Aplicar RLS
                    </Label>
                  </div>
                  {recipients.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRecipient(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
          <Button variant="outline" onClick={onCancel}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Salvando..." : "Salvar Assinatura"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
