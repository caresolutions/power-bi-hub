import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Mail, Clock, Calendar, Trash2, Pencil, Play, Pause, Send, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { SubscriptionForm } from "@/components/subscriptions/SubscriptionForm";
import { useCompanyCustomization } from "@/hooks/useCompanyCustomization";
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

interface Subscription {
  id: string;
  name: string;
  is_active: boolean;
  export_format: string;
  frequency: string;
  schedule_time: string;
  schedule_days_of_week: number[] | null;
  schedule_day_of_month: number | null;
  schedule_interval_hours: number | null;
  report_page: string | null;
  last_sent_at: string | null;
  next_send_at: string | null;
  recipients: { email: string; name: string | null }[];
}

interface Dashboard {
  id: string;
  name: string;
}

const ReportSubscriptions = () => {
  const { dashboardId } = useParams();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  useCompanyCustomization();

  useEffect(() => {
    if (dashboardId) {
      checkAuthAndFetch();
    }
  }, [dashboardId]);

  const checkAuthAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    // Check if admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData?.role !== 'admin') {
      navigate("/home");
      return;
    }

    await fetchDashboard();
    await fetchSubscriptions();
    setLoading(false);
  };

  const fetchDashboard = async () => {
    const { data, error } = await supabase
      .from("dashboards")
      .select("id, name")
      .eq("id", dashboardId)
      .single();

    if (error) {
      toast({
        title: "Erro",
        description: "Dashboard não encontrado",
        variant: "destructive",
      });
      navigate("/dashboards");
      return;
    }
    setDashboard(data);
  };

  const fetchSubscriptions = async () => {
    const { data, error } = await supabase
      .from("report_subscriptions")
      .select(`
        id,
        name,
        is_active,
        export_format,
        frequency,
        schedule_time,
        schedule_days_of_week,
        schedule_day_of_month,
        schedule_interval_hours,
        report_page,
        last_sent_at,
        next_send_at
      `)
      .eq("dashboard_id", dashboardId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching subscriptions:", error);
      return;
    }

    // Fetch recipients for each subscription
    const subsWithRecipients = await Promise.all(
      (data || []).map(async (sub) => {
        const { data: recipients } = await supabase
          .from("subscription_recipients")
          .select("email, name")
          .eq("subscription_id", sub.id);
        
        return {
          ...sub,
          recipients: recipients || []
        };
      })
    );

    setSubscriptions(subsWithRecipients);
  };

  const handleToggleActive = async (subscription: Subscription) => {
    const { error } = await supabase
      .from("report_subscriptions")
      .update({ is_active: !subscription.is_active })
      .eq("id", subscription.id);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: subscription.is_active ? "Assinatura pausada" : "Assinatura ativada",
    });
    fetchSubscriptions();
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    const { error } = await supabase
      .from("report_subscriptions")
      .delete()
      .eq("id", deletingId);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a assinatura",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Assinatura removida com sucesso",
      });
      fetchSubscriptions();
    }
    setDeletingId(null);
  };

  const handleSendNow = async (subscriptionId: string) => {
    setSendingId(subscriptionId);
    
    try {
      const { data, error } = await supabase.functions.invoke('export-report', {
        body: { subscriptionId },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Sucesso",
          description: "Relatório enviado com sucesso!",
        });
        fetchSubscriptions();
      } else {
        throw new Error(data?.error || 'Erro desconhecido');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar relatório';
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSendingId(null);
    }
  };

  const getFrequencyLabel = (sub: Subscription) => {
    const time = sub.schedule_time?.substring(0, 5) || "08:00";
    switch (sub.frequency) {
      case 'once':
        return `Uma vez às ${time}`;
      case 'daily':
        return `Diário às ${time}`;
      case 'weekly':
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const selectedDays = sub.schedule_days_of_week?.map(d => days[d]).join(', ') || '';
        return `Semanal (${selectedDays}) às ${time}`;
      case 'monthly':
        return `Mensal (dia ${sub.schedule_day_of_month}) às ${time}`;
      case 'interval':
        return `A cada ${sub.schedule_interval_hours}h`;
      default:
        return sub.frequency;
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingSubscription(null);
    fetchSubscriptions();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-hero opacity-30" />

      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-card/30 backdrop-blur">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate("/dashboards")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Assinaturas de Relatório</h1>
                  <p className="text-sm text-muted-foreground">{dashboard?.name}</p>
                </div>
              </div>
            </div>

            {!showForm && !editingSubscription && (
              <Button
                onClick={() => setShowForm(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="mr-2 h-5 w-5" />
                Nova Assinatura
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 py-8">
        {showForm || editingSubscription ? (
          <SubscriptionForm
            dashboardId={dashboardId!}
            subscription={editingSubscription}
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setShowForm(false);
              setEditingSubscription(null);
            }}
          />
        ) : subscriptions.length === 0 ? (
          <Card className="p-12 text-center border-border/50">
            <Mail className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-2xl font-bold mb-2">Nenhuma assinatura configurada</h3>
            <p className="text-muted-foreground mb-6">
              Configure envios automáticos de relatórios por email
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="mr-2 h-5 w-5" />
              Criar Primeira Assinatura
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {subscriptions.map((subscription, index) => (
              <motion.div
                key={subscription.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">{subscription.name}</CardTitle>
                        <Badge variant={subscription.is_active ? "default" : "secondary"}>
                          {subscription.is_active ? "Ativa" : "Pausada"}
                        </Badge>
                        <Badge variant="outline" className="uppercase">
                          {subscription.export_format}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(subscription)}
                          title={subscription.is_active ? "Pausar" : "Ativar"}
                        >
                          {subscription.is_active ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingSubscription(subscription)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingId(subscription.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{getFrequencyLabel(subscription)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{subscription.recipients.length} destinatário(s)</span>
                      </div>
                      {subscription.last_sent_at && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Último envio: {new Date(subscription.last_sent_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      )}
                    </div>
                    {subscription.recipients.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          Destinatários: {subscription.recipients.map(r => r.email).join(', ')}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendNow(subscription.id)}
                          disabled={sendingId === subscription.id}
                        >
                          {sendingId === subscription.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Send className="mr-2 h-4 w-4" />
                              Enviar Agora
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Assinatura</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta assinatura? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ReportSubscriptions;
