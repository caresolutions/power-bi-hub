import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, BarChart3, Users, Building2, Eye, Shield, Download, Clock, Info } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

const AccessLogs = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isMasterAdmin, isAdmin, loading: roleLoading, companyId, userId } = useUserRole();
  
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [stats, setStats] = useState<DashboardStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [selectedDashboard, setSelectedDashboard] = useState<string>("all");
  const [hasPermission, setHasPermission] = useState(false);
  const [companyUsers, setCompanyUsers] = useState<UserWithPermission[]>([]);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);

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
      // Create CSV content
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

      // Build CSV string with BOM for Excel UTF-8 compatibility
      const BOM = "\uFEFF";
      const csvContent = BOM + [
        headers.join(";"),
        ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(";")),
      ].join("\n");

      // Create and download file
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

    // Check if user has permission via access_log_permissions
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
        fetchLogs(),
        fetchStats(),
      ]);
    } else {
      await Promise.all([
        fetchCompanyDashboards(),
        fetchLogs(),
        fetchStats(),
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

  const fetchLogs = async () => {
    let query = supabase
      .from("dashboard_access_logs")
      .select(`
        id,
        dashboard_id,
        user_id,
        company_id,
        accessed_at
      `)
      .order("accessed_at", { ascending: false })
      .limit(100);

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

      setLogs(enrichedLogs);
    }
  };

  const fetchStats = async () => {
    // Fetch access counts per dashboard
    const { data: logsData } = await supabase
      .from("dashboard_access_logs")
      .select("dashboard_id");

    if (!logsData) return;

    // Count accesses per dashboard
    const countMap = new Map<string, number>();
    logsData.forEach((log) => {
      countMap.set(log.dashboard_id, (countMap.get(log.dashboard_id) || 0) + 1);
    });

    // Get dashboard and company info
    const dashboardIds = Array.from(countMap.keys());
    if (dashboardIds.length === 0) {
      setStats([]);
      return;
    }

    const { data: dashboardsData } = await supabase
      .from("dashboards")
      .select("id, name, company_id")
      .in("id", dashboardIds);

    if (!dashboardsData) return;

    // Get company names
    const companyIds = [...new Set(dashboardsData.map((d) => d.company_id).filter(Boolean))];
    const { data: companiesData } = await supabase
      .from("companies")
      .select("id, name")
      .in("id", companyIds as string[]);

    const companyMap = new Map(companiesData?.map((c) => [c.id, c.name]) || []);

    const statsData: DashboardStats[] = dashboardsData.map((d) => ({
      dashboard_id: d.id,
      dashboard_name: d.name,
      company_name: d.company_id ? companyMap.get(d.company_id) || "Sem empresa" : "Sem empresa",
      access_count: countMap.get(d.id) || 0,
    }));

    // Sort by access count descending
    statsData.sort((a, b) => b.access_count - a.access_count);
    setStats(statsData.slice(0, 10));
  };

  const fetchCompanyUsers = async () => {
    if (!companyId) return;

    // Get all users from the company
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("company_id", companyId);

    if (!profiles) return;

    // Get existing permissions
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

      // Update local state
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
      fetchLogs();
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Acessos</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{logs.length}</div>
              <p className="text-xs text-muted-foreground">Últimos 100 acessos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Dashboards Ativos</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{new Set(logs.map((l) => l.dashboard_id)).size}</div>
              <p className="text-xs text-muted-foreground">Com acessos recentes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Usuários Únicos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{new Set(logs.map((l) => l.user_id)).size}</div>
              <p className="text-xs text-muted-foreground">Nos últimos acessos</p>
            </CardContent>
          </Card>
        </div>

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
                    <Badge variant="outline">{stat.access_count}</Badge>
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
                <CardTitle className="text-lg">Histórico de Acessos</CardTitle>
                <div className="flex gap-2">
                  {isMasterAdmin && (
                    <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                      <SelectTrigger className="w-40">
                        <Building2 className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Empresa" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {companies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Select value={selectedDashboard} onValueChange={setSelectedDashboard}>
                    <SelectTrigger className="w-40">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Dashboard" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {filteredDashboards.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    {logs.map((log) => (
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
                          <p className="text-muted-foreground">Nenhum acesso registrado</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AccessLogs;
