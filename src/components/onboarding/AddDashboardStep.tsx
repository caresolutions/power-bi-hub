import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { 
  Plus, 
  Trash2, 
  Check, 
  BarChart3,
  Link2,
  Loader2,
  Lightbulb,
  Sparkles
} from "lucide-react";

interface AddDashboardStepProps {
  onComplete: (dashboards: ParsedDashboard[]) => Promise<void>;
  loading?: boolean;
}

interface ParsedDashboard {
  name: string;
  description: string;
  url: string;
  workspaceId: string;
  dashboardId: string;
  reportSection: string;
}

const AddDashboardStep = ({ onComplete, loading }: AddDashboardStepProps) => {
  const [url, setUrl] = useState("");
  const [dashboardName, setDashboardName] = useState("");
  const [description, setDescription] = useState("");
  const [dashboards, setDashboards] = useState<ParsedDashboard[]>([]);
  const [parsing, setParsing] = useState(false);
  const { toast } = useToast();

  const parseDashboardUrl = (url: string): Omit<ParsedDashboard, 'name' | 'url' | 'description'> | null => {
    try {
      // Expected format: https://app.powerbi.com/groups/{workspaceId}/reports/{dashboardId}/{reportSection}
      const match = url.match(/groups\/([^/]+)\/reports\/([^/]+)(?:\/([^?]+))?/);
      
      if (match) {
        return {
          workspaceId: match[1],
          dashboardId: match[2],
          reportSection: match[3] || 'ReportSection',
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
        title: "Campos obrigatórios",
        description: "Preencha o nome e a URL do dashboard",
        variant: "destructive",
      });
      return;
    }

    setParsing(true);

    // Simulate parsing delay for UX
    setTimeout(() => {
      const parsed = parseDashboardUrl(url);
      
      if (!parsed) {
        toast({
          title: "URL inválida",
          description: "Não foi possível extrair as informações. Verifique se é uma URL válida do Power BI.",
          variant: "destructive",
        });
        setParsing(false);
        return;
      }

      setDashboards([...dashboards, { 
        name: dashboardName, 
        description,
        url, 
        ...parsed 
      }]);
      setUrl("");
      setDashboardName("");
      setDescription("");
      setParsing(false);
      
      toast({
        title: "Dashboard adicionado!",
        description: "Informações extraídas automaticamente.",
      });
    }, 500);
  };

  const handleRemoveDashboard = (index: number) => {
    setDashboards(dashboards.filter((_, i) => i !== index));
  };

  const handleComplete = async () => {
    if (dashboards.length === 0) {
      toast({
        title: "Adicione um dashboard",
        description: "Você precisa adicionar pelo menos um dashboard para continuar.",
        variant: "destructive",
      });
      return;
    }

    await onComplete(dashboards);
  };

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Adicionar Dashboards</h2>
        </div>
        <p className="text-muted-foreground">
          Cole a URL do Power BI e as informações serão extraídas automaticamente
        </p>
      </motion.div>

      <Alert className="mb-6 border-yellow-500/30 bg-yellow-500/5">
        <Lightbulb className="h-4 w-4 text-yellow-500" />
        <AlertDescription>
          <strong>Dica:</strong> Abra o relatório no Power BI e copie a URL da barra de endereço do navegador.
        </AlertDescription>
      </Alert>

      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="dashboardName">Nome do Dashboard *</Label>
            <Input
              id="dashboardName"
              value={dashboardName}
              onChange={(e) => setDashboardName(e.target.value)}
              placeholder="Ex: Vendas Q1 2024"
              className="bg-background/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Uma breve descrição do dashboard..."
              className="bg-background/50 resize-none"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              URL do Dashboard *
            </Label>
            <Input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://app.powerbi.com/groups/..."
              className="bg-background/50 font-mono text-sm"
            />
          </div>

          <Button
            type="button"
            onClick={handleAddDashboard}
            variant="outline"
            className="w-full"
            disabled={parsing || !url || !dashboardName}
          >
            {parsing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Extraindo informações...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Dashboard
              </>
            )}
          </Button>
        </motion.div>

        <AnimatePresence>
          {dashboards.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Dashboards Adicionados
                </h3>
                <Badge variant="secondary">{dashboards.length}</Badge>
              </div>
              
              {dashboards.map((dashboard, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Card className="p-4 bg-card/50 border-border/50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-primary" />
                          <h4 className="font-medium">{dashboard.name}</h4>
                        </div>
                        {dashboard.description && (
                          <p className="text-sm text-muted-foreground">
                            {dashboard.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs font-mono">
                            WS: {dashboard.workspaceId.slice(0, 8)}...
                          </Badge>
                          <Badge variant="outline" className="text-xs font-mono">
                            ID: {dashboard.dashboardId.slice(0, 8)}...
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveDashboard(index)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            onClick={handleComplete}
            disabled={loading || dashboards.length === 0}
            className="w-full bg-primary hover:bg-primary/90 shadow-glow"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                Concluir Configuração
                <Check className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default AddDashboardStep;
