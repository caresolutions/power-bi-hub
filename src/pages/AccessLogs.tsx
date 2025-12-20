import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, BarChart3, Users, Building2, Eye, Shield, Download, Clock, Info, Calendar, TrendingUp } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { SearchableSelect, SearchableSelectOption } from "@/components/ui/searchable-select";

interface AccessLog {
  id: string;
  dashboard_id: string;
  user_id: string;
  company_id: string | null;
  accessed_at: string;
  dashboard_name?: string;
  user_email?: string;
  user_name?: string;
  company_name?: string;
}

interface Company {
  id: string;
  name: string;
}

interface Dashboard {
  id: string;
  name: string;
  company_id: string | null;
}

interface DashboardStats {
  dashboard_id: string;
  dashboard_name: string;
  company_name: string;
  access_count: number;
}

interface UserWithPermission {
  id: string;
  email: string;
  full_name: string | null;
  has_permission: boolean;
}

interface ChartDataPoint {
  month: string;
  monthLabel: string;
  total: number;
  [key: string]: string | number;
}

interface UserData {
  id: string;
  email: string;
  full_name: string | null;
}

const PERIOD_OPTIONS = [
  { value: "1", label: "Último mês" },
  { value: "3", label: "Últimos 3 meses" },
  { value: "6", label: "Últimos 6 meses" },
  { value: "12", label: "Últimos 12 meses" },
];

const AccessLogs = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isMasterAdmin, isAdmin, loading: roleLoading, companyId, userId } = useUserRole();
  
  const [allLogs, setAllLogs] = useState<AccessLog[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [stats, setStats] = useState<DashboardStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [selectedDashboard, setSelectedDashboard] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("12");
  const [hasPermission, setHasPermission] = useState(false);
  const [companyUsers, setCompanyUsers] = useState<UserWithPermission[]>([]);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [chartFilter, setChartFilter] = useState<string>("total");
  const [chartFilterType, setChartFilterType] = useState<"user" | "dashboard">("dashboard");
  const [allUsers, setAllUsers] = useState<UserData[]>([]);

  // Calculate date range based on selected period
  const dateRange = useMemo(() => {
    const now = new Date();
    const monthsAgo = parseInt(selectedPeriod);
    return {
      start: startOfMonth(subMonths(now, monthsAgo - 1)),
      end: endOfMonth(now),
    };
  }, [selectedPeriod]);

  // Filter logs by period
  const logs = useMemo(() => {
    return allLogs.filter((log) => {
      const logDate = parseISO(log.accessed_at);
      return isWithinInterval(logDate, { start: dateRange.start, end: dateRange.end });
    });
  }, [allLogs, dateRange]);

  // Calculate stats based on filtered logs
  const periodStats = useMemo(() => {
    const totalAccesses = logs.length;
    const uniqueDashboards = new Set(logs.map((l) => l.dashboard_id)).size;
    const uniqueUsers = new Set(logs.map((l) => l.user_id)).size;
    return { totalAccesses, uniqueDashboards, uniqueUsers };
  }, [logs]);

  // Generate chart data
  const chartData = useMemo(() => {
    const months = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });
    
    const data: ChartDataPoint[] = months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthLogs = logs.filter((log) => {
        const logDate = parseISO(log.accessed_at);
        return isWithinInterval(logDate, { start: monthStart, end: monthEnd });
      });

      const point: ChartDataPoint = {
        month: format(month, "yyyy-MM"),
        monthLabel: format(month, "MMM/yy", { locale: ptBR }),
        total: monthLogs.length,
      };

      // Add filtered data if a specific user or dashboard is selected
      if (chartFilter !== "total") {
        if (chartFilterType === "dashboard") {
          point.filtered = monthLogs.filter((l) => l.dashboard_id === chartFilter).length;
        } else {
          point.filtered = monthLogs.filter((l) => l.user_id === chartFilter).length;
        }
      }

      return point;
    });

    return data;
  }, [logs, dateRange, chartFilter, chartFilterType]);

  // Get filtered item name for chart legend
  const filteredItemName = useMemo(() => {
    if (chartFilter === "total") return null;
    if (chartFilterType === "dashboard") {
      return dashboards.find((d) => d.id === chartFilter)?.name || "Dashboard";
    } else {
      const user = allUsers.find((u) => u.id === chartFilter);
      return user?.full_name || user?.email || "Usuário";
    }
  }, [chartFilter, chartFilterType, dashboards, allUsers]);

  // Export to Excel/CSV function
  const exportToExcel = () => {
    if (logs.length === 0) {
      toast({
        title: "Nenhum dado",
        description: "Não há logs para exportar",
        variant: "destructive",
      });
      return;
    }

    setExporting(true);

    try {
      const headers = isMasterAdmin 
        ? ["Dashboard", "Usuário", "Nome", "Empresa", "Data/Hora"]
        : ["Dashboard", "Usuário", "Nome", "Data/Hora"];

      const rows = logs.map((log) => {
        const baseRow = [
          log.dashboard_name || "",
          log.user_email || "",
          log.user_name || "",
        ];
        
        if (isMasterAdmin) {
          baseRow.push(log.company_name || "");
        }
        
        baseRow.push(format(new Date(log.accessed_at), "dd/MM/yyyy HH:mm", { locale: ptBR }));
        
        return baseRow;
      });

      const BOM = "\uFEFF";
      const csvContent = BOM + [
        headers.join(";"),
        ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(";")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `access-logs-${format(new Date(), "yyyy-MM-dd-HHmm")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Exportação concluída",
        description: `${logs.length} registros exportados com sucesso`,
      });
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os dados",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (!roleLoading) {
      checkPermissionAndFetch();
    }
  }, [roleLoading, isMasterAdmin, isAdmin, companyId]);

  const checkPermissionAndFetch = async () => {
    if (isMasterAdmin || isAdmin) {
      setHasPermission(true);
      fetchData();
      return;
    }

    const { data: permission } = await supabase
      .from("access_log_permissions")
      .select("id")
      .eq("user_id", userId || "")
      .maybeSingle();

    if (permission) {
      setHasPermission(true);
      fetchData();
    } else {
      setHasPermission(false);
      setLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    
    if (isMasterAdmin) {
      await Promise.all([
        fetchCompanies(),
        fetchAllDashboards(),
        fetchAllLogs(),
        fetchAllUsers(),
      ]);
    } else {
      await Promise.all([
        fetchCompanyDashboards(),
        fetchAllLogs(),
        fetchCompanyUsersForChart(),
      ]);
    }
    
    setLoading(false);
  };

  const fetchCompanies = async () => {
    const { data } = await supabase
      .from("companies")
      .select("id, name")
      .order("name");
    
    setCompanies(data || []);
  };

  const fetchAllDashboards = async () => {
    const { data } = await supabase
      .from("dashboards")
      .select("id, name, company_id")
      .order("name");
    
    setDashboards(data || []);
  };

  const fetchCompanyDashboards = async () => {
    if (!companyId) return;
    
    const { data } = await supabase
      .from("dashboards")
      .select("id, name, company_id")
      .eq("company_id", companyId)
      .order("name");
    
    setDashboards(data || []);
  };

  const fetchAllUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .order("email");
    
    setAllUsers(data || []);
  };

  const fetchCompanyUsersForChart = async () => {
    if (!companyId) return;
    
    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("company_id", companyId)
      .order("email");
    
    setAllUsers(data || []);
  };

  const fetchAllLogs = async () => {
    // Fetch all logs from last 12 months (max retention period)
    const twelveMonthsAgo = subMonths(new Date(), 12);
    
    let query = supabase
      .from("dashboard_access_logs")
      .select(`
        id,
        dashboard_id,
        user_id,
        company_id,
        accessed_at
      `)
      .gte("accessed_at", twelveMonthsAgo.toISOString())
      .order("accessed_at", { ascending: false });

    if (selectedCompany !== "all" && isMasterAdmin) {
      query = query.eq("company_id", selectedCompany);
    }

    if (selectedDashboard !== "all") {
      query = query.eq("dashboard_id", selectedDashboard);
    }

    const { data } = await query;

    if (data) {
      // Enrich logs with dashboard, user, and company names
      const enrichedLogs = await Promise.all(
        data.map(async (log) => {
          const [dashboardRes, profileRes, companyRes] = await Promise.all([
            supabase.from("dashboards").select("name").eq("id", log.dashboard_id).maybeSingle(),
            supabase.from("profiles").select("email, full_name").eq("id", log.user_id).maybeSingle(),
            log.company_id 
              ? supabase.from("companies").select("name").eq("id", log.company_id).maybeSingle()
              : Promise.resolve({ data: null }),
          ]);

          return {
            ...log,
            dashboard_name: dashboardRes.data?.name || "Dashboard removido",
            user_email: profileRes.data?.email || "Usuário removido",
            user_name: profileRes.data?.full_name || null,
            company_name: companyRes.data?.name || null,
          };
        })
      );

      setAllLogs(enrichedLogs);
      calculateStats(enrichedLogs);
    }
  };

  const calculateStats = (logsData: AccessLog[]) => {
    // Count accesses per dashboard
    const countMap = new Map<string, number>();
    logsData.forEach((log) => {
      countMap.set(log.dashboard_id, (countMap.get(log.dashboard_id) || 0) + 1);
    });

    // Create stats from logs
    const dashboardMap = new Map<string, { name: string; company: string }>();
    logsData.forEach((log) => {
      if (!dashboardMap.has(log.dashboard_id)) {
        dashboardMap.set(log.dashboard_id, {
          name: log.dashboard_name || "Dashboard removido",
          company: log.company_name || "Sem empresa",
        });
      }
    });

    const statsData: DashboardStats[] = Array.from(countMap.entries()).map(([dashboardId, count]) => ({
      dashboard_id: dashboardId,
      dashboard_name: dashboardMap.get(dashboardId)?.name || "Dashboard removido",
      company_name: dashboardMap.get(dashboardId)?.company || "Sem empresa",
      access_count: count,
    }));

    statsData.sort((a, b) => b.access_count - a.access_count);
    setStats(statsData.slice(0, 10));
  };

  const fetchCompanyUsers = async () => {
    if (!companyId) return;

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("company_id", companyId);

    if (!profiles) return;

    const { data: permissions } = await supabase
      .from("access_log_permissions")
      .select("user_id")
      .eq("company_id", companyId);

    const permittedUserIds = new Set(permissions?.map((p) => p.user_id) || []);

    const usersWithPermission: UserWithPermission[] = profiles.map((p) => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      has_permission: permittedUserIds.has(p.id),
    }));

    setCompanyUsers(usersWithPermission);
  };

  const toggleUserPermission = async (targetUserId: string, grant: boolean) => {
    if (!companyId || !userId) return;

    setSavingPermissions(true);

    try {
      if (grant) {
        await supabase.from("access_log_permissions").insert({
          user_id: targetUserId,
          company_id: companyId,
          granted_by: userId,
        });
      } else {
        await supabase
          .from("access_log_permissions")
          .delete()
          .eq("user_id", targetUserId)
          .eq("company_id", companyId);
      }

      setCompanyUsers((prev) =>
        prev.map((u) =>
          u.id === targetUserId ? { ...u, has_permission: grant } : u
        )
      );

      toast({
        title: grant ? "Permissão concedida" : "Permissão revogada",
        description: `Usuário ${grant ? "agora pode" : "não pode mais"} visualizar os logs de acesso`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível alterar a permissão",
        variant: "destructive",
      });
    } finally {
      setSavingPermissions(false);
    }
  };

  useEffect(() => {
    if (!roleLoading && hasPermission) {
      fetchAllLogs();
    }
  }, [selectedCompany, selectedDashboard]);

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Acesso Restrito</h2>
            <p className="text-muted-foreground mb-4">
              Você não tem permissão para visualizar os logs de acesso. 
              Solicite acesso ao administrador da sua empresa.
            </p>
            <Button onClick={() => navigate("/home")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredDashboards = selectedCompany === "all" 
    ? dashboards 
    : dashboards.filter((d) => d.company_id === selectedCompany);

  const chartConfig = {
    total: {
      label: "Total de Acessos",
      color: "hsl(var(--primary))",
    },
    filtered: {
      label: filteredItemName || "Selecionado",
      color: "hsl(var(--chart-2))",
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/home")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Controle de Acessos</h1>
              <p className="text-muted-foreground text-sm">
                Monitore os acessos aos dashboards
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={exportToExcel}
              disabled={exporting || logs.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              {exporting ? "Exportando..." : "Exportar Excel"}
            </Button>

            {isAdmin && !isMasterAdmin && (
              <Dialog open={permissionDialogOpen} onOpenChange={setPermissionDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" onClick={fetchCompanyUsers}>
                    <Users className="mr-2 h-4 w-4" />
                    Permissões
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Permissões de Visualização</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="max-h-96">
                    <div className="space-y-3">
                      {companyUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{user.email}</p>
                            {user.full_name && (
                              <p className="text-sm text-muted-foreground">{user.full_name}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={user.has_permission}
                              disabled={savingPermissions}
                              onCheckedChange={(checked) =>
                                toggleUserPermission(user.id, checked as boolean)
                              }
                            />
                            <span className="text-sm text-muted-foreground">
                              {user.has_permission ? "Permitido" : "Bloqueado"}
                            </span>
                          </div>
                        </div>
                      ))}
                      {companyUsers.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">
                          Nenhum usuário encontrado
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Retention Info Alert */}
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription className="flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <span>
              Os logs de acesso são mantidos por <strong>12 meses</strong>. 
              Registros mais antigos são removidos automaticamente para otimização do sistema.
            </span>
          </AlertDescription>
        </Alert>

        {/* Period Filter */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Período:</span>
          </div>
          <SearchableSelect
            options={PERIOD_OPTIONS}
            value={selectedPeriod}
            onValueChange={setSelectedPeriod}
            placeholder="Selecione o período"
            searchPlaceholder="Buscar período..."
            triggerClassName="w-48"
          />
          <span className="text-sm text-muted-foreground">
            {format(dateRange.start, "dd/MM/yyyy", { locale: ptBR })} - {format(dateRange.end, "dd/MM/yyyy", { locale: ptBR })}
          </span>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Acessos</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{periodStats.totalAccesses.toLocaleString('pt-BR')}</div>
              <p className="text-xs text-muted-foreground">No período selecionado</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Dashboards Ativos</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{periodStats.uniqueDashboards.toLocaleString('pt-BR')}</div>
              <p className="text-xs text-muted-foreground">Com acessos no período</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Usuários Únicos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{periodStats.uniqueUsers.toLocaleString('pt-BR')}</div>
              <p className="text-xs text-muted-foreground">No período selecionado</p>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Histórico de Acessos
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <SearchableSelect
                  options={[
                    { value: "dashboard", label: "Dashboard" },
                    { value: "user", label: "Usuário" },
                  ]}
                  value={chartFilterType}
                  onValueChange={(v) => { setChartFilterType(v as "user" | "dashboard"); setChartFilter("total"); }}
                  triggerClassName="w-32"
                  searchPlaceholder="Buscar..."
                />
                {chartFilterType === "dashboard" ? (
                  <SearchableSelect
                    options={[
                      { value: "total", label: "Todos os Dashboards" },
                      ...dashboards.map((d) => ({ value: d.id, label: d.name })),
                    ]}
                    value={chartFilter}
                    onValueChange={setChartFilter}
                    placeholder="Selecione"
                    searchPlaceholder="Buscar dashboard..."
                    triggerClassName="w-48"
                    icon={<BarChart3 className="h-4 w-4" />}
                  />
                ) : (
                  <SearchableSelect
                    options={[
                      { value: "total", label: "Todos os Usuários" },
                      ...allUsers.map((u) => ({ value: u.id, label: u.full_name || u.email })),
                    ]}
                    value={chartFilter}
                    onValueChange={setChartFilter}
                    placeholder="Selecione"
                    searchPlaceholder="Buscar usuário..."
                    triggerClassName="w-48"
                    icon={<Users className="h-4 w-4" />}
                  />
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="monthLabel" 
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 12 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Total de Acessos"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                    activeDot={{ r: 6 }}
                  />
                  {chartFilter !== "total" && (
                    <Line
                      type="monotone"
                      dataKey="filtered"
                      name={filteredItemName || "Selecionado"}
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--chart-2))" }}
                      activeDot={{ r: 6 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Filters and Rankings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ranking */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Top Dashboards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.slice(0, 5).map((stat, index) => (
                  <div key={stat.dashboard_id} className="flex items-center gap-3">
                    <Badge variant={index === 0 ? "default" : "secondary"} className="w-6 h-6 flex items-center justify-center p-0">
                      {index + 1}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{stat.dashboard_name}</p>
                      {isMasterAdmin && (
                        <p className="text-xs text-muted-foreground truncate">{stat.company_name}</p>
                      )}
                    </div>
                    <Badge variant="outline">{stat.access_count.toLocaleString('pt-BR')}</Badge>
                  </div>
                ))}
                {stats.length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    Nenhum acesso registrado
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Logs Table */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-lg">Últimos Acessos</CardTitle>
                <div className="flex gap-2">
                  {isMasterAdmin && (
                    <SearchableSelect
                      options={[
                        { value: "all", label: "Todas as Empresas" },
                        ...companies.map((c) => ({ value: c.id, label: c.name })),
                      ]}
                      value={selectedCompany}
                      onValueChange={setSelectedCompany}
                      placeholder="Empresa"
                      searchPlaceholder="Buscar empresa..."
                      triggerClassName="w-48"
                      icon={<Building2 className="h-4 w-4" />}
                    />
                  )}
                  <SearchableSelect
                    options={[
                      { value: "all", label: "Todos os Dashboards" },
                      ...filteredDashboards.map((d) => ({ value: d.id, label: d.name })),
                    ]}
                    value={selectedDashboard}
                    onValueChange={setSelectedDashboard}
                    placeholder="Dashboard"
                    searchPlaceholder="Buscar dashboard..."
                    triggerClassName="w-48"
                    icon={<BarChart3 className="h-4 w-4" />}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dashboard</TableHead>
                      <TableHead>Usuário</TableHead>
                      {isMasterAdmin && <TableHead>Empresa</TableHead>}
                      <TableHead>Data/Hora</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.slice(0, 100).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.dashboard_name}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{log.user_email}</p>
                            {log.user_name && (
                              <p className="text-xs text-muted-foreground">{log.user_name}</p>
                            )}
                          </div>
                        </TableCell>
                        {isMasterAdmin && (
                          <TableCell>{log.company_name || "-"}</TableCell>
                        )}
                        <TableCell>
                          {format(new Date(log.accessed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))}
                    {logs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={isMasterAdmin ? 4 : 3} className="text-center py-8">
                          <p className="text-muted-foreground">Nenhum acesso registrado no período</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {logs.length > 100 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Exibindo os 100 registros mais recentes de {logs.length.toLocaleString('pt-BR')} no período
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AccessLogs;
