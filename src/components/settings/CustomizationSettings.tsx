import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Palette, Upload, Save, X, FileText, Loader2, Sparkles } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface CompanyCustomization {
  id: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string | null;
  background_color: string | null;
  foreground_color: string | null;
  muted_color: string | null;
  destructive_color: string | null;
  success_color: string | null;
  card_color: string | null;
  border_color: string | null;
}

interface ColorField {
  key: keyof FormData;
  label: string;
  description: string;
}

interface FormData {
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  foreground_color: string;
  muted_color: string;
  destructive_color: string;
  success_color: string;
  card_color: string;
  border_color: string;
}

const defaultColors: FormData = {
  logo_url: "",
  primary_color: "#0891b2",
  secondary_color: "#06b6d4",
  accent_color: "#0ea5e9",
  background_color: "#ffffff",
  foreground_color: "#0f172a",
  muted_color: "#94a3b8",
  destructive_color: "#ef4444",
  success_color: "#22c55e",
  card_color: "#ffffff",
  border_color: "#e2e8f0",
};

const colorFields: ColorField[] = [
  { key: "primary_color", label: "Cor Primária", description: "Cor principal da marca" },
  { key: "secondary_color", label: "Cor Secundária", description: "Cor de destaque secundária" },
  { key: "accent_color", label: "Cor de Acento", description: "Botões e interações" },
  { key: "background_color", label: "Fundo", description: "Cor de fundo geral" },
  { key: "foreground_color", label: "Texto Principal", description: "Cor do texto" },
  { key: "muted_color", label: "Texto Secundário", description: "Elementos desabilitados" },
  { key: "destructive_color", label: "Ações Destrutivas", description: "Excluir, alertas" },
  { key: "success_color", label: "Sucesso", description: "Confirmações positivas" },
  { key: "card_color", label: "Cards", description: "Fundo de cartões" },
  { key: "border_color", label: "Bordas", description: "Cor das bordas" },
];

export const CustomizationSettings = () => {
  const [company, setCompany] = useState<CompanyCustomization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [formData, setFormData] = useState<FormData>(defaultColors);
  const { toast } = useToast();

  useEffect(() => {
    fetchCompany();
  }, []);

  const fetchCompany = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (profile?.company_id) {
      const { data: companyData } = await supabase
        .from("companies")
        .select("id, logo_url, primary_color, secondary_color, accent_color, background_color, foreground_color, muted_color, destructive_color, success_color, card_color, border_color")
        .eq("id", profile.company_id)
        .single();

      if (companyData) {
        setCompany(companyData);
        setFormData({
          logo_url: companyData.logo_url || "",
          primary_color: companyData.primary_color || defaultColors.primary_color,
          secondary_color: companyData.secondary_color || defaultColors.secondary_color,
          accent_color: companyData.accent_color || defaultColors.accent_color,
          background_color: companyData.background_color || defaultColors.background_color,
          foreground_color: companyData.foreground_color || defaultColors.foreground_color,
          muted_color: companyData.muted_color || defaultColors.muted_color,
          destructive_color: companyData.destructive_color || defaultColors.destructive_color,
          success_color: companyData.success_color || defaultColors.success_color,
          card_color: companyData.card_color || defaultColors.card_color,
          border_color: companyData.border_color || defaultColors.border_color,
        });
      }
    }
    setLoading(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !company) return;

    setUploading(true);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${company.id}-logo.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('company-logos')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({
        title: "Erro",
        description: "Não foi possível fazer upload do logo",
        variant: "destructive",
      });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('company-logos')
      .getPublicUrl(filePath);

    setFormData({ ...formData, logo_url: publicUrl });
    setUploading(false);
    
    toast({
      title: "Sucesso",
      description: "Logo carregado com sucesso",
    });
  };

  const handleBrandbookUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "Erro",
        description: "Por favor, envie um arquivo PDF",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "O arquivo deve ter no máximo 10MB",
        variant: "destructive",
      });
      return;
    }

    setExtracting(true);
    
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        const { data, error } = await supabase.functions.invoke('extract-brandbook', {
          body: { pdfBase64: base64 }
        });

        if (error) {
          throw new Error(error.message);
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Erro ao extrair dados do brandbook');
        }

        // Update form with extracted colors
        const extractedData = data.data;
        setFormData(prev => ({
          ...prev,
          primary_color: extractedData.primary_color,
          secondary_color: extractedData.secondary_color,
          accent_color: extractedData.accent_color,
          background_color: extractedData.background_color,
          foreground_color: extractedData.foreground_color,
          muted_color: extractedData.muted_color,
          destructive_color: extractedData.destructive_color,
          success_color: extractedData.success_color,
          card_color: extractedData.card_color,
          border_color: extractedData.border_color,
        }));

        toast({
          title: "Brandbook Analisado!",
          description: `Cores extraídas com confiança ${extractedData.confidence === 'high' ? 'alta' : extractedData.confidence === 'medium' ? 'média' : 'baixa'}. Revise e ajuste se necessário.`,
        });
      };

      reader.onerror = () => {
        throw new Error('Erro ao ler o arquivo');
      };
    } catch (error) {
      console.error('Erro ao processar brandbook:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível processar o brandbook",
        variant: "destructive",
      });
    } finally {
      setExtracting(false);
    }
  };

  const handleRemoveLogo = () => {
    setFormData({ ...formData, logo_url: "" });
  };

  const handleColorChange = (key: keyof FormData, value: string) => {
    setFormData({ ...formData, [key]: value });
  };

  const handleResetColors = () => {
    setFormData(prev => ({
      ...prev,
      ...defaultColors,
      logo_url: prev.logo_url,
    }));
    toast({
      title: "Cores Resetadas",
      description: "As cores foram restauradas para os valores padrão",
    });
  };

  const handleSave = async () => {
    if (!company) return;
    
    setSaving(true);
    const { error } = await supabase
      .from("companies")
      .update({
        logo_url: formData.logo_url || null,
        primary_color: formData.primary_color,
        secondary_color: formData.secondary_color,
        accent_color: formData.accent_color,
        background_color: formData.background_color,
        foreground_color: formData.foreground_color,
        muted_color: formData.muted_color,
        destructive_color: formData.destructive_color,
        success_color: formData.success_color,
        card_color: formData.card_color,
        border_color: formData.border_color,
      })
      .eq("id", company.id);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações",
        variant: "destructive",
      });
    } else {
      applyColors(formData);
      
      toast({
        title: "Sucesso",
        description: "Personalização aplicada com sucesso!",
      });
    }
    setSaving(false);
  };

  const hexToHSL = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return "200 98% 39%";

    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const applyColors = (colors: FormData) => {
    const root = document.documentElement;
    
    root.style.setProperty("--primary", hexToHSL(colors.primary_color));
    root.style.setProperty("--ring", hexToHSL(colors.primary_color));
    root.style.setProperty("--sidebar-primary", hexToHSL(colors.primary_color));
    root.style.setProperty("--sidebar-ring", hexToHSL(colors.primary_color));
    root.style.setProperty("--accent", hexToHSL(colors.accent_color));
    root.style.setProperty("--muted", hexToHSL(colors.muted_color));
    root.style.setProperty("--destructive", hexToHSL(colors.destructive_color));
  };

  if (loading) {
    return <div className="text-muted-foreground">Carregando...</div>;
  }

  if (!company) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Nenhuma empresa cadastrada.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Brandbook Upload Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>Extração Automática</CardTitle>
          </div>
          <CardDescription>
            Faça upload do brandbook (PDF) da sua empresa para extrair automaticamente as cores e elementos visuais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept=".pdf"
              onChange={handleBrandbookUpload}
              disabled={extracting}
              className="hidden"
              id="brandbook-upload"
            />
            <Label htmlFor="brandbook-upload" className="cursor-pointer">
              <Button variant="outline" asChild disabled={extracting} className="gap-2">
                <span>
                  {extracting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analisando com IA...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      Carregar Brandbook (PDF)
                    </>
                  )}
                </span>
              </Button>
            </Label>
            <p className="text-sm text-muted-foreground">
              Máximo 10MB. A IA extrairá cores automaticamente.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Main Customization Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <CardTitle>Personalização Visual</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={handleResetColors}>
              Resetar Cores
            </Button>
          </div>
          <CardDescription>
            Personalize a aparência da plataforma com o logo e as cores da sua empresa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload */}
          <div className="space-y-3">
            <Label>Logo da Empresa</Label>
            <div className="flex items-center gap-4">
              {formData.logo_url ? (
                <div className="relative">
                  <img
                    src={formData.logo_url}
                    alt="Logo da empresa"
                    className="h-20 w-auto max-w-[200px] object-contain rounded-lg border bg-card p-2"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={handleRemoveLogo}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="h-20 w-40 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground">
                  Sem logo
                </div>
              )}
              <div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                  className="hidden"
                  id="logo-upload"
                />
                <Label htmlFor="logo-upload" className="cursor-pointer">
                  <Button variant="outline" asChild disabled={uploading}>
                    <span>
                      <Upload className="mr-2 h-4 w-4" />
                      {uploading ? "Enviando..." : "Carregar Logo"}
                    </span>
                  </Button>
                </Label>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Recomendado: PNG ou SVG com fundo transparente, max 2MB
            </p>
          </div>

          <Separator />

          {/* Color Palette */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Paleta de Cores</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {colorFields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key} className="text-sm">
                    {field.label}
                    <span className="block text-xs text-muted-foreground font-normal">
                      {field.description}
                    </span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      id={field.key}
                      value={formData[field.key]}
                      onChange={(e) => handleColorChange(field.key, e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={formData[field.key]}
                      onChange={(e) => handleColorChange(field.key, e.target.value)}
                      className="flex-1 font-mono text-sm"
                      placeholder="#000000"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Preview */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Pré-visualização</Label>
            <div 
              className="rounded-lg p-6 space-y-4"
              style={{ backgroundColor: formData.background_color }}
            >
              {/* Header Preview */}
              <div 
                className="rounded-lg p-4 flex items-center gap-4"
                style={{ backgroundColor: formData.primary_color }}
              >
                {formData.logo_url && (
                  <img
                    src={formData.logo_url}
                    alt="Preview"
                    className="h-10 w-auto max-w-[100px] object-contain"
                  />
                )}
                <span className="text-white font-semibold">Sua Empresa</span>
              </div>
              
              {/* Card Preview */}
              <div 
                className="rounded-lg p-4 space-y-3"
                style={{ 
                  backgroundColor: formData.card_color,
                  borderColor: formData.border_color,
                  borderWidth: '1px',
                  borderStyle: 'solid'
                }}
              >
                <h3 style={{ color: formData.foreground_color }} className="font-semibold">
                  Título do Card
                </h3>
                <p style={{ color: formData.muted_color }} className="text-sm">
                  Texto secundário de exemplo
                </p>
                <div className="flex gap-2">
                  <button 
                    className="px-3 py-1 rounded text-white text-sm"
                    style={{ backgroundColor: formData.primary_color }}
                  >
                    Primário
                  </button>
                  <button 
                    className="px-3 py-1 rounded text-white text-sm"
                    style={{ backgroundColor: formData.accent_color }}
                  >
                    Acento
                  </button>
                  <button 
                    className="px-3 py-1 rounded text-white text-sm"
                    style={{ backgroundColor: formData.success_color }}
                  >
                    Sucesso
                  </button>
                  <button 
                    className="px-3 py-1 rounded text-white text-sm"
                    style={{ backgroundColor: formData.destructive_color }}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Salvando..." : "Salvar Personalização"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
