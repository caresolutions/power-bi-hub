import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart3, ArrowLeft, Link2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface Dashboard {
  id: string;
  name: string;
  workspace_id: string;
  dashboard_id: string;
  report_section: string | null;
  credential_id: string | null;
}

interface Credential {
  id: string;
  name: string;
}

interface DashboardFormProps {
  dashboard?: Dashboard | null;
  credentials: Credential[];
  onSuccess: () => void;
  onCancel: () => void;
}

const DashboardForm = ({ dashboard, credentials, onSuccess, onCancel }: DashboardFormProps) => {
  const [url, setUrl] = useState("");
  const [name, setName] = useState(dashboard?.name || "");
  const [workspaceId, setWorkspaceId] = useState(dashboard?.workspace_id || "");
  const [dashboardId, setDashboardId] = useState(dashboard?.dashboard_id || "");
  const [reportSection, setReportSection] = useState(dashboard?.report_section || "");
  const [credentialId, setCredentialId] = useState(dashboard?.credential_id || "");
  const [loading, setLoading] = useState(false);
  const [urlParsed, setUrlParsed] = useState(false);
  const { toast } = useToast();

  const isEditing = !!dashboard;

  const parseDashboardUrl = (inputUrl: string) => {
    try {
      // Expected format: https://app.powerbi.com/groups/{workspaceId}/reports/{dashboardId}/{reportSection}
      const match = inputUrl.match(/groups\/([^/]+)\/reports\/([^/]+)\/([^?]+)/);
      
      if (match) {
        setWorkspaceId(match[1]);
        setDashboardId(match[2]);
        setReportSection(match[3]);
        setUrlParsed(true);
        
        toast({
          title: "URL processada!",
          description: "Campos preenchidos automaticamente",
        });
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    setUrlParsed(false);
    
    // Auto-parse when URL looks complete
    if (value.includes("powerbi.com") && value.includes("/reports/")) {
      parseDashboardUrl(value);
    }
  };

  const handleParseUrl = () => {
    if (!url) {
      toast({
        title: "Erro",
        description: "Cole a URL do dashboard primeiro",
        variant: "destructive",
      });
      return;
    }

    const success = parseDashboardUrl(url);
    if (!success) {
      toast({
        title: "URL inválida",
        description: "Não foi possível extrair as informações. Verifique se a URL está no formato correto.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (isEditing) {
        const { error } = await supabase
          .from("dashboards")
          .update({
            name,
            workspace_id: workspaceId,
            dashboard_id: dashboardId,
            report_section: reportSection || null,
            credential_id: credentialId || null,
          })
          .eq("id", dashboard.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Dashboard atualizado com sucesso",
        });
      } else {
        const { error } = await supabase
          .from("dashboards")
          .insert({
            owner_id: user.id,
            name,
            workspace_id: workspaceId,
            dashboard_id: dashboardId,
            report_section: reportSection || null,
            credential_id: credentialId || null,
          });

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Dashboard criado com sucesso",
        });
      }

      onSuccess();
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <Button variant="ghost" className="mb-6" onClick={onCancel}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      <Card className="glass p-8 border-border/50">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-accent/10 p-4 rounded-xl">
            <BarChart3 className="h-8 w-8 text-accent" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {isEditing ? "Editar Dashboard" : "Novo Dashboard"}
            </h2>
            <p className="text-muted-foreground">
              {isEditing 
                ? "Atualize as informações do dashboard" 
                : "Cole a URL do Power BI para extrair automaticamente"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* URL Parser Section */}
          {!isEditing && (
            <div className="space-y-2 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <Label htmlFor="url" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                URL do Dashboard (preenchimento automático)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://app.powerbi.com/groups/..."
                  className="bg-background/50 font-mono text-sm flex-1"
                />
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={handleParseUrl}
                  className="shrink-0"
                >
                  <Link2 className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Cole a URL completa do Power BI para extrair Workspace ID, Report ID e Section automaticamente
              </p>
              {urlParsed && (
                <p className="text-xs text-green-500 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Campos preenchidos automaticamente!
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="credentialId">Credencial do Power BI</Label>
            <Select value={credentialId} onValueChange={setCredentialId}>
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="Selecione uma credencial" />
              </SelectTrigger>
              <SelectContent>
                {credentials.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Nenhuma credencial cadastrada
                  </SelectItem>
                ) : (
                  credentials.map((credential) => (
                    <SelectItem key={credential.id} value={credential.id}>
                      {credential.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {credentials.length === 0 && (
              <p className="text-xs text-amber-500">
                Configure suas credenciais primeiro em "Configuração de Ambiente"
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome do Dashboard</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Ex: Vendas Mensais"
              className="bg-background/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workspaceId">Workspace ID</Label>
            <Input
              id="workspaceId"
              type="text"
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              required
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="bg-background/50 font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dashboardId">Dashboard/Report ID</Label>
            <Input
              id="dashboardId"
              type="text"
              value={dashboardId}
              onChange={(e) => setDashboardId(e.target.value)}
              required
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="bg-background/50 font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reportSection">Report Section (opcional)</Label>
            <Input
              id="reportSection"
              type="text"
              value={reportSection}
              onChange={(e) => setReportSection(e.target.value)}
              placeholder="Nome da seção do relatório"
              className="bg-background/50"
            />
          </div>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/90 shadow-glow"
              disabled={loading}
            >
              {loading ? "Salvando..." : isEditing ? "Salvar Alterações" : "Criar Dashboard"}
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );
};

export default DashboardForm;
