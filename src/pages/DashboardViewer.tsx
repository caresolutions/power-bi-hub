import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, RefreshCw, History, Bookmark, Star, MessageSquare } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { RefreshHistoryDialog } from "@/components/dashboards/RefreshHistoryDialog";
import { BookmarksDialog } from "@/components/dashboards/BookmarksDialog";
import { ReportPagesNav } from "@/components/dashboards/ReportPagesNav";
import { DashboardChatDialog } from "@/components/dashboards/DashboardChatDialog";
import SliderViewer from "@/components/dashboards/SliderViewer";
import { useDashboardFavorites } from "@/hooks/useDashboardFavorites";
import { useAccessLog } from "@/hooks/useAccessLog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as pbi from "powerbi-client";
import { cn } from "@/lib/utils";

interface Dashboard {
  id: string;
  name: string;
  workspace_id: string;
  dashboard_id: string;
  report_section: string | null;
  embed_type: string;
  public_link: string | null;
  credential_id: string | null;
}

interface EmbedData {
  embedUrl: string;
  embedToken: string;
  expiration: string;
  reportSection: string | null;
}

interface LastRefresh {
  completed_at: string | null;
  status: string;
}

interface ReportPage {
  name: string;
  displayName: string;
  isActive?: boolean;
}

const DashboardViewer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [embedLoading, setEmbedLoading] = useState(false);
  const [embedError, setEmbedError] = useState<string | null>(null);
  const [canRefresh, setCanRefresh] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<LastRefresh | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [reportPages, setReportPages] = useState<ReportPage[]>([]);
  const [currentPage, setCurrentPage] = useState<string>("");
  
  const embedContainerRef = useRef<HTMLDivElement>(null);
  const powerbiRef = useRef<pbi.service.Service | null>(null);
  const reportRef = useRef<pbi.Report | null>(null);
  
  const { isFavorite, toggleFavorite } = useDashboardFavorites();
  const { logDashboardAccess } = useAccessLog();

  useEffect(() => {
    powerbiRef.current = new pbi.service.Service(
      pbi.factories.hpmFactory,
      pbi.factories.wpmpFactory,
      pbi.factories.routerFactory
    );

    return () => {
      if (embedContainerRef.current && powerbiRef.current) {
        powerbiRef.current.reset(embedContainerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const checkAuthAndFetchDashboard = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      if (id) {
        fetchDashboard(id, user.id);
        checkRefreshPermission(id, user.id);
        fetchLastRefresh(id);
        // Log dashboard access
        logDashboardAccess(id);
      }
    };

    checkAuthAndFetchDashboard();
  }, [id, navigate]);

  const checkRefreshPermission = async (dashboardId: string, userId: string) => {
    const { data } = await supabase
      .from("user_dashboard_refresh_permissions")
      .select("id")
      .eq("dashboard_id", dashboardId)
      .eq("user_id", userId)
      .maybeSingle();

    setCanRefresh(!!data);
  };

  const fetchLastRefresh = async (dashboardId: string) => {
    const { data } = await supabase
      .from("dashboard_refresh_history")
      .select("completed_at, status")
      .eq("dashboard_id", dashboardId)
      .eq("status", "completed")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setLastRefresh(data);
    }
  };

  const handleRefresh = async () => {
    if (!dashboard) return;
    
    setRefreshing(true);
    try {
      const response = await supabase.functions.invoke("refresh-dataset", {
        body: { dashboardId: dashboard.id },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data as { success: boolean; error?: string; message?: string };

      if (!data.success) {
        throw new Error(data.error || "Falha ao atualizar");
      }

      toast({
        title: "Sucesso",
        description: data.message || "Atualização do dataset iniciada",
      });

      if (id) {
        fetchLastRefresh(id);
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const fetchDashboard = async (dashboardId: string, userId: string) => {
    try {
      let { data, error } = await supabase
        .from("dashboards")
        .select("id, name, workspace_id, dashboard_id, report_section, embed_type, public_link, credential_id")
        .eq("id", dashboardId)
        .single();

      if (error) {
        const { data: accessData } = await supabase
          .from("user_dashboard_access")
          .select("dashboard_id")
          .eq("dashboard_id", dashboardId)
          .eq("user_id", userId)
          .single();

        if (!accessData) {
          toast({
            title: "Acesso negado",
            description: "Você não tem permissão para visualizar este dashboard",
            variant: "destructive",
          });
          navigate("/dashboards");
          return;
        }

        const { data: dashboardData, error: fetchError } = await supabase
          .from("dashboards")
          .select("id, name, workspace_id, dashboard_id, report_section, embed_type, public_link, credential_id")
          .eq("id", dashboardId)
          .single();

        if (fetchError) throw fetchError;
        data = dashboardData;
      }

      setDashboard(data);

      if (data?.embed_type === "workspace_id" && data?.credential_id) {
        await fetchEmbedToken(dashboardId);
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
      navigate("/dashboards");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmbedToken = async (dashboardId: string) => {
    setEmbedLoading(true);
    setEmbedError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const response = await supabase.functions.invoke("get-powerbi-embed", {
        body: { dashboardId },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data as EmbedData & { success: boolean; error?: string };

      if (!data.success) {
        throw new Error(data.error || "Falha ao obter token de embed");
      }

      setEmbedLoading(false);
      
      setTimeout(() => {
        embedReport(data);
      }, 100);
    } catch (error: any) {
      console.error("Error fetching embed token:", error);
      setEmbedError(error.message);
      setEmbedLoading(false);
    }
  };

  const embedReport = (embedData: EmbedData) => {
    if (!embedContainerRef.current || !powerbiRef.current) return;

    const config: pbi.IEmbedConfiguration = {
      type: "report",
      tokenType: pbi.models.TokenType.Embed,
      accessToken: embedData.embedToken,
      embedUrl: embedData.embedUrl,
      settings: {
        panes: {
          filters: { visible: false },
          pageNavigation: { visible: false }, // Hide default nav, use our custom one
        },
        background: pbi.models.BackgroundType.Default,
        visualSettings: {
          visualHeaders: [
            {
              settings: {
                visible: true,
              },
            },
          ],
        },
      },
    };

    if (embedData.reportSection) {
      config.pageName = embedData.reportSection;
    }

    powerbiRef.current.reset(embedContainerRef.current);

    const report = powerbiRef.current.embed(embedContainerRef.current, config) as pbi.Report;
    reportRef.current = report;

    report.on("error", (event: any) => {
      const errorDetail = event.detail;
      console.error("Power BI embed error:", errorDetail);
      
      // Ignore non-critical errors that occur during normal interactions
      const nonCriticalErrors = [
        "visualClickedFailed",
        "Invoked filter serialization function with no filter",
        "drillDownFailed",
        "drillUpFailed",
      ];
      
      const errorMessage = errorDetail?.message || "";
      const isNonCritical = nonCriticalErrors.some(err => 
        errorMessage.toLowerCase().includes(err.toLowerCase())
      );
      
      if (!isNonCritical) {
        setEmbedError("Erro ao carregar o dashboard");
      }
    });

    report.on("loaded", async () => {
      console.log("Report loaded successfully");
      
      // Get report pages for navigation
      try {
        const pages = await report.getPages();
        const pageList = pages.map(page => ({
          name: page.name,
          displayName: page.displayName,
          isActive: page.isActive,
        }));
        setReportPages(pageList);
        
        const activePage = pageList.find(p => p.isActive);
        if (activePage) {
          setCurrentPage(activePage.name);
        }
      } catch (err) {
        console.error("Error getting pages:", err);
      }
    });

    report.on("rendered", () => {
      console.log("Report rendered successfully");
    });

    report.on("pageChanged", (event: any) => {
      const newPage = event.detail.newPage;
      setCurrentPage(newPage.name);
    });
  };

  const handlePageChange = async (pageName: string) => {
    if (!reportRef.current) return;
    
    try {
      const pages = await reportRef.current.getPages();
      const targetPage = pages.find(p => p.name === pageName);
      if (targetPage) {
        await targetPage.setActive();
        setCurrentPage(pageName);
      }
    } catch (err) {
      console.error("Error changing page:", err);
    }
  };

  const getCurrentState = useCallback(async () => {
    if (!reportRef.current) {
      return {
        page: currentPage,
        timestamp: new Date().toISOString(),
      };
    }

    try {
      // Use Power BI's built-in bookmark capture to get full report state
      const capturedBookmark = await reportRef.current.bookmarksManager.capture();
      return {
        bookmarkState: capturedBookmark.state,
        page: currentPage,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      console.error("Error capturing bookmark state:", err);
      return {
        page: currentPage,
        timestamp: new Date().toISOString(),
      };
    }
  }, [currentPage]);

  const handleApplyBookmark = useCallback(async (bookmarkState: any) => {
    if (!reportRef.current) return;
    
    try {
      // Apply the full bookmark state using Power BI's bookmarksManager
      if (bookmarkState.bookmarkState) {
        await reportRef.current.bookmarksManager.applyState(bookmarkState.bookmarkState);
      } else if (bookmarkState.page) {
        // Fallback for old bookmarks that only have page
        await handlePageChange(bookmarkState.page);
      }
      
      toast({
        title: "Visualização aplicada",
        description: "O estado salvo foi restaurado",
      });
    } catch (err) {
      console.error("Error applying bookmark:", err);
      toast({
        title: "Erro",
        description: "Não foi possível aplicar a visualização salva",
        variant: "destructive",
      });
    }
  }, [toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Carregando dashboard...</p>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Dashboard não encontrado</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header with back button */}
      <div className="flex-shrink-0 h-10 bg-background border-b border-border flex items-center justify-between px-2">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate("/dashboards")} 
            className="text-xs h-7 px-2"
          >
            <ArrowLeft className="mr-1 h-3 w-3" />
            Voltar
          </Button>
          
          {/* Favorite button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleFavorite(dashboard.id)}
            className="text-xs h-7 px-2"
          >
            <Star
              className={cn(
                "h-3 w-3",
                isFavorite(dashboard.id) ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
              )}
            />
          </Button>
          
          <span className="ml-2 text-sm font-medium text-foreground truncate">{dashboard.name}</span>
          
          {/* Report Pages Navigation */}
          {reportPages.length > 1 && dashboard.embed_type === "workspace_id" && (
            <div className="ml-4">
              <ReportPagesNav
                pages={reportPages}
                currentPage={currentPage}
                onPageChange={handlePageChange}
              />
            </div>
          )}
          
          {lastRefresh && lastRefresh.completed_at && (
            <span className="ml-4 text-xs text-muted-foreground hidden md:inline">
              Última atualização: {format(new Date(lastRefresh.completed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {/* Chat with Data button */}
          {dashboard.embed_type === "workspace_id" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setChatOpen(true)}
              className="text-xs h-7 px-2"
            >
              <MessageSquare className="h-3 w-3" />
              <span className="ml-1 hidden sm:inline">Chat IA</span>
            </Button>
          )}
          
          {/* Bookmarks button */}
          {dashboard.embed_type === "workspace_id" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBookmarksOpen(true)}
              className="text-xs h-7 px-2"
            >
              <Bookmark className="h-3 w-3" />
              <span className="ml-1 hidden sm:inline">Visualizações</span>
            </Button>
          )}
          
          {canRefresh && dashboard.embed_type === "workspace_id" && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHistoryOpen(true)}
                className="text-xs h-7 px-2"
              >
                <History className="h-3 w-3" />
                <span className="ml-1 hidden sm:inline">Histórico</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="text-xs h-7 px-3"
              >
                <RefreshCw className={`mr-1 h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Atualizando..." : "Atualizar Dados"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Refresh History Dialog */}
      <RefreshHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        dashboardId={dashboard.id}
        dashboardName={dashboard.name}
      />

      {/* Bookmarks Dialog */}
      <BookmarksDialog
        open={bookmarksOpen}
        onOpenChange={setBookmarksOpen}
        dashboardId={dashboard.id}
        dashboardName={dashboard.name}
        onApplyBookmark={handleApplyBookmark}
        getCurrentState={getCurrentState}
      />

      {/* Chat with Data Dialog */}
      <DashboardChatDialog
        open={chatOpen}
        onOpenChange={setChatOpen}
        dashboardId={dashboard.id}
        dashboardName={dashboard.name}
      />

      {/* Dashboard content */}
      <div className="flex-1 w-full h-full overflow-hidden">
        {dashboard.embed_type === "slider" ? (
          <div className="w-full h-full">
            <SliderViewer dashboardId={dashboard.id} />
          </div>
        ) : dashboard.embed_type === "public_link" && dashboard.public_link ? (
          <iframe
            src={dashboard.public_link}
            className="w-full h-full"
            style={{ border: "none" }}
            allowFullScreen
            title={dashboard.name}
          />
        ) : dashboard.embed_type === "workspace_id" && dashboard.credential_id ? (
          <>
            {embedLoading && (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Conectando ao Power BI...</p>
              </div>
            )}
            {embedError && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                  <p className="text-destructive mb-4">{embedError}</p>
                  <Button onClick={() => fetchEmbedToken(dashboard.id)}>
                    Tentar novamente
                  </Button>
                </div>
              </div>
            )}
            <div
              ref={embedContainerRef}
              className={`w-full h-full ${embedLoading || embedError ? 'hidden' : ''}`}
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-8">
              <p className="text-muted-foreground mb-4">
                Este dashboard requer configuração de credenciais.
              </p>
              <p className="text-sm text-muted-foreground">
                Workspace: {dashboard.workspace_id}<br />
                Report ID: {dashboard.dashboard_id}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardViewer;
