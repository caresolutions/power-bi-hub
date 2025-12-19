import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart3, ArrowLeft, Link2, Sparkles, X, Tag, Building2, Play } from "lucide-react";
import { motion } from "framer-motion";
import SliderSlidesManager, { SliderSlide } from "./SliderSlidesManager";

interface Dashboard {
  id: string;
  name: string;
  workspace_id: string;
  dashboard_id: string;
  report_section: string | null;
  credential_id: string | null;
  embed_type: string;
  public_link: string | null;
  description?: string | null;
  category?: string | null;
  tags?: string[] | null;
  dataset_id?: string | null;
  dataset_schema?: string | null;
  company_id?: string | null;
}

interface Credential {
  id: string;
  name: string;
}

interface Company {
  id: string;
  name: string;
}

interface DashboardFormProps {
  dashboard?: Dashboard | null;
  credentials: Credential[];
  onSuccess: () => void;
  onCancel: () => void;
  isMasterAdmin?: boolean;
  defaultCompanyId?: string;
}

const DashboardForm = ({ dashboard, credentials, onSuccess, onCancel, isMasterAdmin = false, defaultCompanyId }: DashboardFormProps) => {
  const [url, setUrl] = useState("");
  const [name, setName] = useState(dashboard?.name || "");
  const [embedType, setEmbedType] = useState(dashboard?.embed_type || "workspace_id");
  const [publicLink, setPublicLink] = useState(dashboard?.public_link || "");
  const [workspaceId, setWorkspaceId] = useState(dashboard?.workspace_id || "");
  const [dashboardId, setDashboardId] = useState(dashboard?.dashboard_id || "");
  const [reportSection, setReportSection] = useState(dashboard?.report_section || "");
  const [credentialId, setCredentialId] = useState(dashboard?.credential_id || "");
  const [description, setDescription] = useState(dashboard?.description || "");
  const [category, setCategory] = useState(dashboard?.category || "");
  const [tags, setTags] = useState<string[]>(dashboard?.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [datasetSchema, setDatasetSchema] = useState(dashboard?.dataset_schema || "");
  const [companyId, setCompanyId] = useState(dashboard?.company_id || defaultCompanyId || "");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [urlParsed, setUrlParsed] = useState(false);
  const [sliderSlides, setSliderSlides] = useState<SliderSlide[]>([]);
  const { toast } = useToast();

  const isEditing = !!dashboard;

  useEffect(() => {
    if (isMasterAdmin) {
      fetchCompanies();
    }
  }, [isMasterAdmin]);

  useEffect(() => {
    if (isEditing && dashboard?.embed_type === "slider") {
      fetchSliderSlides();
    }
  }, [isEditing, dashboard]);

  const fetchCompanies = async () => {
    const { data } = await supabase.from("companies").select("id, name").order("name");
    setCompanies(data || []);
  };

  const fetchSliderSlides = async () => {
    if (!dashboard?.id) return;
    const { data } = await supabase
      .from("slider_slides")
      .select("*")
      .eq("dashboard_id", dashboard.id)
      .order("slide_order");
    
    if (data) {
      setSliderSlides(data.map(s => ({
        id: s.id,
        slide_name: s.slide_name,
        workspace_id: s.workspace_id,
        report_id: s.report_id,
        report_section: s.report_section || "",
        credential_id: s.credential_id || "",
        duration_seconds: s.duration_seconds,
        slide_order: s.slide_order,
        transition_type: s.transition_type,
        is_visible: s.is_visible,
      })));
    }
  };


  const predefinedCategories = [
    "Vendas",
    "Financeiro",
    "Marketing",
    "Operações",
    "RH",
    "Logística",
    "Produção",
    "Outro",
  ];

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag();
    }
  };


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

      // Validate slider has slides
      if (embedType === "slider" && sliderSlides.length === 0) {
        throw new Error("Adicione pelo menos um slide ao Slider");
      }

      // Get company_id - use selected for master admin, or fetch from profile
      let targetCompanyId = companyId;
      if (!isMasterAdmin) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("id", user.id)
          .single();

        if (!profile?.company_id) {
          throw new Error("Empresa não configurada");
        }
        targetCompanyId = profile.company_id;
      } else if (!companyId) {
        throw new Error("Selecione uma empresa");
      }

      // Determine workspace_id and dashboard_id based on embed type
      const getWorkspaceId = () => {
        if (embedType === "public_link" || embedType === "slider") return "slider";
        return workspaceId;
      };
      const getDashboardId = () => {
        if (embedType === "public_link" || embedType === "slider") return "slider";
        return dashboardId;
      };

      if (isEditing) {
        const { error } = await (supabase as any)
          .from("dashboards")
          .update({
            name,
            embed_type: embedType,
            public_link: publicLink || null,
            workspace_id: getWorkspaceId(),
            dashboard_id: getDashboardId(),
            report_section: reportSection || null,
            credential_id: embedType === "public_link" || embedType === "slider" ? null : (credentialId || null),
            description: description || null,
            category: category || null,
            tags: tags.length > 0 ? tags : null,
            dataset_schema: datasetSchema || null,
          })
          .eq("id", dashboard.id);

        if (error) throw error;

        // Handle slider slides
        if (embedType === "slider") {
          await saveSliderSlides(dashboard.id);
        }

        toast({
          title: "Sucesso",
          description: "Dashboard atualizado com sucesso",
        });
      } else {
        const { data: newDashboard, error } = await (supabase as any)
          .from("dashboards")
          .insert({
            owner_id: user.id,
            name,
            embed_type: embedType,
            public_link: publicLink || null,
            workspace_id: getWorkspaceId(),
            dashboard_id: getDashboardId(),
            report_section: reportSection || null,
            credential_id: embedType === "public_link" || embedType === "slider" ? null : (credentialId || null),
            company_id: targetCompanyId,
            description: description || null,
            category: category || null,
            tags: tags.length > 0 ? tags : null,
            dataset_schema: datasetSchema || null,
          })
          .select()
          .single();

        if (error) throw error;

        // Handle slider slides
        if (embedType === "slider" && newDashboard) {
          await saveSliderSlides(newDashboard.id);
        }

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

  const saveSliderSlides = async (dashboardId: string) => {
    // Delete existing slides
    await supabase.from("slider_slides").delete().eq("dashboard_id", dashboardId);
    
    // Insert new slides
    if (sliderSlides.length > 0) {
      const slidesToInsert = sliderSlides.map((slide, index) => ({
        dashboard_id: dashboardId,
        slide_name: slide.slide_name,
        workspace_id: slide.workspace_id,
        report_id: slide.report_id,
        report_section: slide.report_section || null,
        credential_id: slide.credential_id || null,
        duration_seconds: slide.duration_seconds,
        slide_order: index + 1,
        transition_type: slide.transition_type,
        is_visible: slide.is_visible,
      }));

      const { error } = await supabase.from("slider_slides").insert(slidesToInsert);
      if (error) throw error;
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
          {/* Embed Type Selector */}
          <div className="space-y-2">
            <Label>Tipo de Integração</Label>
            <Select value={embedType} onValueChange={setEmbedType}>
              <SelectTrigger className="bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="workspace_id">ID do Workspace (Power BI Embedded)</SelectItem>
                <SelectItem value="public_link">Link Público</SelectItem>
                <SelectItem value="slider">
                  <div className="flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    Slider (Múltiplos Dashboards)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {embedType === "public_link" 
                ? "Use um link público para incorporar o dashboard diretamente" 
                : embedType === "slider"
                ? "Mescle múltiplos dashboards em uma apresentação rotativa para exibição em TVs"
                : "Use as credenciais do Power BI para incorporar dashboards privados"}
            </p>
          </div>

          {/* Slider Section */}
          {embedType === "slider" && (
            <div className="space-y-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <SliderSlidesManager
                slides={sliderSlides}
                onSlidesChange={setSliderSlides}
                credentials={credentials}
              />
            </div>
          )}

          {/* Public Link Section */}
          {embedType === "public_link" && (
            <div className="space-y-2 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <Label htmlFor="publicLink" className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" />
                Link Público do Dashboard
              </Label>
              <Input
                id="publicLink"
                type="url"
                value={publicLink}
                onChange={(e) => setPublicLink(e.target.value)}
                placeholder="https://app.powerbi.com/view?r=..."
                className="bg-background/50 font-mono text-sm"
                required={embedType === "public_link"}
              />
              <p className="text-xs text-muted-foreground">
                Cole o link público do Power BI (formato: https://app.powerbi.com/view?r=...)
              </p>
            </div>
          )}

          {/* URL Parser Section - Only for workspace_id type */}
          {embedType === "workspace_id" && !isEditing && (
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

          {/* Company Selector for Master Admin */}
          {isMasterAdmin && (
            <div className="space-y-2">
              <Label htmlFor="companyId" className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Empresa
              </Label>
              <Select value={companyId} onValueChange={setCompanyId} required>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {embedType === "workspace_id" && (
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
          )}

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

          {embedType === "workspace_id" && (
            <>
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
            </>
          )}

          {/* Catalog Fields Section */}
          <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Tag className="h-4 w-4" />
              Informações do Catálogo
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve descrição do dashboard..."
                className="bg-background/50 min-h-[80px] resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {predefinedCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="Digite e pressione Enter..."
                  className="bg-background/50 flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim()}
                >
                  Adicionar
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Adicione tags para facilitar a busca e organização
              </p>
            </div>
          </div>

          {/* AI Chat Schema Section - Only for workspace_id type with dataset */}
          {embedType === "workspace_id" && (
            <div className="space-y-4 p-4 rounded-lg bg-accent/5 border border-accent/20">
              <div className="flex items-center gap-2 text-sm font-medium text-accent">
                <Sparkles className="h-4 w-4" />
                Schema do Dataset (Chat IA)
              </div>
              <div className="space-y-2">
                <Label htmlFor="datasetSchema">Tabelas e Colunas</Label>
                <Textarea
                  id="datasetSchema"
                  value={datasetSchema}
                  onChange={(e) => setDatasetSchema(e.target.value)}
                  placeholder="Chamados: ID, Status, DataAbertura, Cliente | Clientes: ID, Nome, CNPJ"
                  className="bg-background/50 min-h-[100px] resize-none font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Informe as tabelas e colunas do dataset para habilitar o Chat IA. 
                  Formato: <code className="bg-muted px-1 rounded">Tabela: Col1, Col2 | Tabela2: Col1, Col2</code>
                </p>
              </div>
            </div>
          )}

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
