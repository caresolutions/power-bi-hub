import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Maximize2, Minimize2, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import * as pbi from "powerbi-client";

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

const DashboardViewer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [embedLoading, setEmbedLoading] = useState(false);
  const [embedError, setEmbedError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const embedContainerRef = useRef<HTMLDivElement>(null);
  const powerbiRef = useRef<pbi.service.Service | null>(null);

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
      }
    };

    checkAuthAndFetchDashboard();
  }, [id, navigate]);

  const fetchDashboard = async (dashboardId: string, userId: string) => {
    try {
      // First try to fetch as owner (admin)
      let { data, error } = await supabase
        .from("dashboards")
        .select("id, name, workspace_id, dashboard_id, report_section, embed_type, public_link, credential_id")
        .eq("id", dashboardId)
        .single();

      if (error) {
        // If not owner, check if user has access
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

        // Fetch dashboard with RPC or direct query
        const { data: dashboardData, error: fetchError } = await supabase
          .from("dashboards")
          .select("id, name, workspace_id, dashboard_id, report_section, embed_type, public_link, credential_id")
          .eq("id", dashboardId)
          .single();

        if (fetchError) throw fetchError;
        data = dashboardData;
      }

      setDashboard(data);

      // If it's a workspace_id type with credential, fetch embed token
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

      // Embed the report
      embedReport(data);
    } catch (error: any) {
      console.error("Error fetching embed token:", error);
      setEmbedError(error.message);
    } finally {
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
          pageNavigation: { visible: true },
        },
        background: pbi.models.BackgroundType.Transparent,
      },
    };

    // If there's a specific report section, add it
    if (embedData.reportSection) {
      config.pageName = embedData.reportSection;
    }

    // Reset any existing embed
    powerbiRef.current.reset(embedContainerRef.current);

    // Embed the report
    const report = powerbiRef.current.embed(embedContainerRef.current, config);

    report.on("error", (event: any) => {
      console.error("Power BI embed error:", event.detail);
      setEmbedError("Erro ao carregar o dashboard");
    });

    report.on("loaded", () => {
      console.log("Report loaded successfully");
    });
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

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
    <div className={`min-h-screen bg-background flex flex-col ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      {!isFullscreen && (
        <header className="border-b border-border/50 bg-card/30 backdrop-blur">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate("/dashboards")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <h1 className="text-xl font-bold">{dashboard.name}</h1>
              </div>
              <Button variant="outline" size="icon" onClick={toggleFullscreen}>
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>
      )}

      {/* Fullscreen header */}
      {isFullscreen && (
        <div className="absolute top-4 right-4 z-10">
          <Button variant="outline" size="icon" onClick={toggleFullscreen} className="bg-background/80 backdrop-blur">
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Dashboard content */}
      <div className="flex-1">
        {dashboard.embed_type === "public_link" && dashboard.public_link ? (
          <iframe
            src={dashboard.public_link}
            className="w-full h-full min-h-[calc(100vh-80px)]"
            style={{ border: "none" }}
            allowFullScreen
            title={dashboard.name}
          />
        ) : dashboard.embed_type === "workspace_id" && dashboard.credential_id ? (
          <>
            {embedLoading && (
              <div className="flex items-center justify-center h-full min-h-[calc(100vh-80px)]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Conectando ao Power BI...</p>
              </div>
            )}
            {embedError && (
              <div className="flex items-center justify-center h-full min-h-[calc(100vh-80px)]">
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
              className={`w-full h-full min-h-[calc(100vh-80px)] ${embedLoading || embedError ? 'hidden' : ''}`}
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full min-h-[calc(100vh-80px)]">
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
