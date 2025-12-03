import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Maximize2, Minimize2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Dashboard {
  id: string;
  name: string;
  workspace_id: string;
  dashboard_id: string;
  report_section: string | null;
  embed_type: string;
  public_link: string | null;
}

const DashboardViewer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
        .select("id, name, workspace_id, dashboard_id, report_section, embed_type, public_link")
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
          .select("id, name, workspace_id, dashboard_id, report_section, embed_type, public_link")
          .eq("id", dashboardId)
          .single();

        if (fetchError) throw fetchError;
        data = dashboardData;
      }

      setDashboard(data);
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

  const getEmbedUrl = () => {
    if (!dashboard) return "";

    if (dashboard.embed_type === "public_link") {
      return dashboard.public_link || "";
    }

    // For workspace_id type, construct Power BI embed URL
    // Note: This requires proper authentication setup for Power BI embedded
    return `https://app.powerbi.com/reportEmbed?reportId=${dashboard.dashboard_id}&groupId=${dashboard.workspace_id}`;
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando dashboard...</p>
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

      {/* Dashboard iframe */}
      <div className="flex-1">
        {dashboard.embed_type === "public_link" && dashboard.public_link ? (
          <iframe
            src={dashboard.public_link}
            className="w-full h-full min-h-[calc(100vh-80px)]"
            style={{ border: "none" }}
            allowFullScreen
            title={dashboard.name}
          />
        ) : (
          <div className="flex items-center justify-center h-full min-h-[calc(100vh-80px)]">
            <div className="text-center p-8">
              <p className="text-muted-foreground mb-4">
                Este dashboard requer autenticação Power BI Embedded.
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
