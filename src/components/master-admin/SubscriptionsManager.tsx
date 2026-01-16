import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Loader2, 
  CreditCard, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign,
  Calendar,
  RefreshCw,
  Building2,
  Crown
} from "lucide-react";
import { format, subDays, subMonths, startOfDay, endOfDay, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Subscription {
  id: string;
  user_id: string;
  status: string;
  plan: string;
  current_period_start: string | null;
  current_period_end: string | null;
  is_master_managed: boolean | null;
  created_at: string;
  stripe_subscription_id: string | null;
  profile?: {
    email: string;
    full_name: string | null;
    company?: {
      name: string;
    } | null;
  };
}

interface SubscriptionStats {
  total: number;
  active: number;
  trial: number;
  canceled: number;
  newThisPeriod: number;
  canceledThisPeriod: number;
}

type PeriodFilter = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  semiannual: 'Semestral',
  annual: 'Anual',
};

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Ativo', variant: 'default' },
  trial: { label: 'Trial', variant: 'secondary' },
  canceled: { label: 'Cancelado', variant: 'destructive' },
  expired: { label: 'Expirado', variant: 'outline' },
  past_due: { label: 'Pagamento Pendente', variant: 'destructive' },
};

export const SubscriptionsManager = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [planLabels, setPlanLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodFilter>('monthly');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch plans to get labels
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('plan_key, name');

      if (plansError) throw plansError;

      // Create plan labels map from database
      const labels: Record<string, string> = {
        master_managed: 'Master Managed',
        free: 'Free',
      };
      (plansData || []).forEach((plan: any) => {
        labels[plan.plan_key] = plan.name;
      });
      setPlanLabels(labels);

      // Fetch all subscriptions
      const { data: subsData, error: subsError } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (subsError) throw subsError;

      // Fetch profiles with companies for all user_ids
      const userIds = (subsData || []).map(s => s.user_id);
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          company:companies (
            name
          )
        `);

      if (profilesError) throw profilesError;

      // Map profiles by id for quick lookup
      const profilesMap = new Map(
        (profilesData || []).map((p: any) => [p.id, p])
      );

      // Combine subscriptions with profiles
      const transformedData = (subsData || []).map((sub: any) => {
        // Convert user_id to string for comparison since profiles.id is text
        const profile = profilesMap.get(String(sub.user_id));
        return {
          ...sub,
          profile: profile ? {
            email: profile.email,
            full_name: profile.full_name,
            company: profile.company
          } : undefined
        };
      });

      setSubscriptions(transformedData);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('Erro ao carregar assinaturas');
    } finally {
      setLoading(false);
    }
  };

  const getPeriodDateRange = (periodType: PeriodFilter) => {
    const now = new Date();
    const end = endOfDay(now);
    let start: Date;

    switch (periodType) {
      case 'daily':
        start = startOfDay(now);
        break;
      case 'weekly':
        start = startOfDay(subDays(now, 7));
        break;
      case 'monthly':
        start = startOfDay(subMonths(now, 1));
        break;
      case 'quarterly':
        start = startOfDay(subMonths(now, 3));
        break;
      case 'semiannual':
        start = startOfDay(subMonths(now, 6));
        break;
      case 'annual':
        start = startOfDay(subMonths(now, 12));
        break;
      default:
        start = startOfDay(subMonths(now, 1));
    }

    return { start, end };
  };

  const getStats = (): SubscriptionStats => {
    const { start, end } = getPeriodDateRange(period);
    
    const total = subscriptions.length;
    const active = subscriptions.filter(s => s.status === 'active').length;
    const trial = subscriptions.filter(s => s.status === 'trial').length;
    const canceled = subscriptions.filter(s => s.status === 'canceled').length;
    
    const newThisPeriod = subscriptions.filter(s => {
      const createdAt = parseISO(s.created_at);
      return isWithinInterval(createdAt, { start, end });
    }).length;
    
    const canceledThisPeriod = subscriptions.filter(s => {
      if (s.status !== 'canceled') return false;
      // Use updated_at or created_at as proxy for cancellation date
      const date = parseISO(s.created_at);
      return isWithinInterval(date, { start, end });
    }).length;

    return { total, active, trial, canceled, newThisPeriod, canceledThisPeriod };
  };

  const getFilteredSubscriptions = () => {
    let filtered = subscriptions;
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    return filtered;
  };

  const stats = getStats();
  const filteredSubscriptions = getFilteredSubscriptions();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gestão de Assinaturas</h2>
        <div className="flex items-center gap-4">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <TabsList>
              {Object.entries(PERIOD_LABELS).map(([key, label]) => (
                <TabsTrigger key={key} value={key} className="text-xs sm:text-sm">
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button variant="outline" size="icon" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold mt-2">{stats.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Ativos</span>
            </div>
            <p className="text-2xl font-bold mt-2 text-green-500">{stats.active}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Trial</span>
            </div>
            <p className="text-2xl font-bold mt-2 text-blue-500">{stats.trial}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span className="text-sm text-muted-foreground">Cancelados</span>
            </div>
            <p className="text-2xl font-bold mt-2 text-destructive">{stats.canceled}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Novos ({PERIOD_LABELS[period]})</span>
            </div>
            <p className="text-2xl font-bold mt-2 text-green-500">{stats.newThisPeriod}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-muted-foreground">Cancelados ({PERIOD_LABELS[period]})</span>
            </div>
            <p className="text-2xl font-bold mt-2 text-amber-500">{stats.canceledThisPeriod}</p>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Lista de Assinaturas
              </CardTitle>
              <CardDescription>
                {filteredSubscriptions.length} assinatura(s) encontrada(s)
              </CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="canceled">Cancelados</SelectItem>
                <SelectItem value="expired">Expirados</SelectItem>
                <SelectItem value="past_due">Pagamento Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSubscriptions.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma assinatura encontrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Término</TableHead>
                  <TableHead>Gerenciado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{sub.profile?.full_name || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">{sub.profile?.email || 'N/A'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{sub.profile?.company?.name || 'Sem empresa'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {planLabels[sub.plan] || sub.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_LABELS[sub.status]?.variant || 'outline'}>
                        {STATUS_LABELS[sub.status]?.label || sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sub.current_period_start 
                        ? format(parseISO(sub.current_period_start), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {sub.current_period_end 
                        ? format(parseISO(sub.current_period_end), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {sub.is_master_managed ? (
                        <Badge variant="secondary">Master</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
