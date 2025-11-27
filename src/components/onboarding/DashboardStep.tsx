import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Check } from "lucide-react";

interface DashboardStepProps {
  onComplete: () => void;
}

interface ParsedDashboard {
  name: string;
  url: string;
  workspaceId: string;
  dashboardId: string;
  reportSection: string;
}

const DashboardStep = ({ onComplete }: DashboardStepProps) => {
  const [url, setUrl] = useState("");
  const [dashboardName, setDashboardName] = useState("");
  const [dashboards, setDashboards] = useState<ParsedDashboard[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const parseDashboardUrl = (url: string): Omit<ParsedDashboard, 'name' | 'url'> | null => {
    try {
      // Expected format: https://app.powerbi.com/groups/{workspaceId}/reports/{dashboardId}/{reportSection}
      const match = url.match(/groups\/([^/]+)\/reports\/([^/]+)\/([^?]+)/);
      
      if (match) {
        return {
          workspaceId: match[1],
          dashboardId: match[2],
          reportSection: match[3],
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  };

  const handleAddDashboard = () => {
    if (!url || !dashboardName) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    const parsed = parseDashboardUrl(url);
    
    if (!parsed) {
      toast({
        title: "URL inválida",
        description: "Não foi possível extrair as informações do dashboard. Verifique a URL.",
        variant: "destructive",
      });
      return;
    }

    setDashboards([...dashboards, { name: dashboardName, url, ...parsed }]);
    setUrl("");
    setDashboardName("");
    
    toast({
      title: "Dashboard adicionado!",
      description: "Dashboard foi extraído e adicionado com sucesso.",
    });
  };

  const handleRemoveDashboard = (index: number) => {
    setDashboards(dashboards.filter((_, i) => i !== index));
  };

  const handleComplete = async () => {
    if (dashboards.length === 0) {
      toast({
        title: "Adicione um dashboard",
        description: "Você precisa adicionar pelo menos um dashboard.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("dashboards")
        .insert(
          dashboards.map((dashboard) => ({
            owner_id: user.id,
            name: dashboard.name,
            workspace_id: dashboard.workspaceId,
            dashboard_id: dashboard.dashboardId,
            report_section: dashboard.reportSection,
          }))
        );

      if (error) throw error;

      onComplete();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">
          Passo 2: Adicionar Dashboards
        </h2>
        <p className="text-muted-foreground">
          Cole a URL do dashboard do Power BI e deixe a IA extrair as informações automaticamente
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dashboardName">Nome do Dashboard</Label>
            <Input
              id="dashboardName"
              type="text"
              value={dashboardName}
              onChange={(e) => setDashboardName(e.target.value)}
              placeholder="Vendas Q1 2024"
              className="bg-background/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL do Dashboard</Label>
            <Input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://app.powerbi.com/groups/..."
              className="bg-background/50 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              A IA irá extrair automaticamente: Workspace ID, Dashboard ID e Report Section
            </p>
          </div>

          <Button
            type="button"
            onClick={handleAddDashboard}
            variant="outline"
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Dashboard
          </Button>
        </div>

        {dashboards.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Dashboards Adicionados</h3>
            {dashboards.map((dashboard, index) => (
              <Card key={index} className="p-4 bg-card/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <h4 className="font-medium">{dashboard.name}</h4>
                    <div className="text-sm text-muted-foreground space-y-1 font-mono">
                      <p>Workspace: {dashboard.workspaceId}</p>
                      <p>Dashboard: {dashboard.dashboardId}</p>
                      <p>Section: {dashboard.reportSection}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveDashboard(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Button
          onClick={handleComplete}
          disabled={loading || dashboards.length === 0}
          className="w-full bg-primary hover:bg-primary/90 shadow-glow"
        >
          {loading ? "Salvando..." : "Concluir Configuração"}
          <Check className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default DashboardStep;
