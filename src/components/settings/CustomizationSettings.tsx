import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Palette, Upload, Save, X, FileText, Loader2, Sparkles, Type, Lightbulb, Check } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  font_primary: string | null;
  font_secondary: string | null;
  border_radius: string | null;
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
  font_primary: string;
  font_secondary: string;
  border_radius: string;
}

interface ExtractedData {
  brand_name?: string;
  fonts?: {
    primary?: string;
    secondary?: string;
  };
  style?: {
    border_radius?: string;
    visual_tone?: string;
    contrast_level?: string;
  };
  logo_description?: string;
  design_recommendations?: string[];
  confidence?: string;
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
  font_primary: "",
  font_secondary: "",
  border_radius: "md",
};

const getColorFields = (t: (key: string) => string): ColorField[] => [
  { key: "primary_color", label: t('settings.primaryButtons'), description: t('settings.primaryButtonsDesc') },
  { key: "secondary_color", label: t('settings.secondaryElements'), description: t('settings.secondaryElementsDesc') },
  { key: "accent_color", label: t('settings.linksHighlights'), description: t('settings.linksHighlightsDesc') },
  { key: "background_color", label: t('settings.pageBackground'), description: t('settings.pageBackgroundDesc') },
  { key: "foreground_color", label: t('settings.mainText'), description: t('settings.mainTextDesc') },
  { key: "muted_color", label: t('settings.disabledText'), description: t('settings.disabledTextDesc') },
  { key: "destructive_color", label: t('settings.deleteButtons'), description: t('settings.deleteButtonsDesc') },
  { key: "success_color", label: t('settings.success'), description: t('settings.successDesc') },
  { key: "card_color", label: t('settings.cardBackground'), description: t('settings.cardBackgroundDesc') },
  { key: "border_color", label: t('settings.borders'), description: t('settings.bordersDesc') },
];

const popularFonts = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Nunito",
  "Raleway",
  "Source Sans Pro",
  "Ubuntu",
  "Playfair Display",
  "Merriweather",
  "Oswald",
  "DM Sans",
  "Space Grotesk",
  "Manrope",
  "Work Sans",
  "Outfit",
  "Plus Jakarta Sans",
  "Figtree",
];

const getBorderRadiusOptions = (t: (key: string) => string) => [
  { value: "none", label: t('settings.straight'), css: "0" },
  { value: "sm", label: t('settings.small'), css: "0.125rem" },
  { value: "md", label: t('settings.medium'), css: "0.375rem" },
  { value: "lg", label: t('settings.large'), css: "0.5rem" },
  { value: "xl", label: t('settings.extraLarge'), css: "0.75rem" },
  { value: "full", label: t('settings.rounded'), css: "9999px" },
];

interface CustomizationSettingsProps {
  companyId?: string | null;
}

export const CustomizationSettings = ({ companyId }: CustomizationSettingsProps) => {
  const { t } = useTranslation();
  const [company, setCompany] = useState<CompanyCustomization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [formData, setFormData] = useState<FormData>(defaultColors);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const { toast } = useToast();

  // Get translated options
  const colorFields = getColorFields(t);
  const borderRadiusOptions = getBorderRadiusOptions(t);

  useEffect(() => {
    fetchCompany();
  }, [companyId]);

  const fetchCompany = async () => {
    setLoading(true);
    
    let targetCompanyId = companyId;
    
    if (!targetCompanyId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      targetCompanyId = profile?.company_id;
    }

    if (targetCompanyId) {
      const { data: companyData } = await supabase
        .from("companies")
        .select("id, logo_url, primary_color, secondary_color, accent_color, background_color, foreground_color, muted_color, destructive_color, success_color, card_color, border_color, font_primary, font_secondary, border_radius")
        .eq("id", targetCompanyId)
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
          font_primary: companyData.font_primary || "",
          font_secondary: companyData.font_secondary || "",
          border_radius: companyData.border_radius || "md",
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
    setExtractedData(null);
    
    try {
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

        const extracted = data.data;
        
        // Update form with extracted data
        setFormData(prev => ({
          ...prev,
          primary_color: extracted.primary_color,
          secondary_color: extracted.secondary_color,
          accent_color: extracted.accent_color,
          background_color: extracted.background_color,
          foreground_color: extracted.foreground_color,
          muted_color: extracted.muted_color,
          destructive_color: extracted.destructive_color,
          success_color: extracted.success_color,
          card_color: extracted.card_color,
          border_color: extracted.border_color,
          font_primary: extracted.fonts?.primary || prev.font_primary,
          font_secondary: extracted.fonts?.secondary || prev.font_secondary,
          border_radius: extracted.style?.border_radius || prev.border_radius,
        }));

        // Store extracted metadata for display
        setExtractedData({
          brand_name: extracted.brand_name,
          fonts: extracted.fonts,
          style: extracted.style,
          logo_description: extracted.logo_description,
          design_recommendations: extracted.design_recommendations,
          confidence: extracted.confidence,
        });

        toast({
          title: "Brandbook Analisado com Sucesso!",
          description: `Identidade visual extraída com confiança ${extracted.confidence === 'high' ? 'alta' : extracted.confidence === 'medium' ? 'média' : 'baixa'}`,
        });
        
        setExtracting(false);
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
    setExtractedData(null);
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
        font_primary: formData.font_primary || null,
        font_secondary: formData.font_secondary || null,
        border_radius: formData.border_radius || 'md',
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
    
    // Cores principais
    root.style.setProperty("--primary", hexToHSL(colors.primary_color));
    root.style.setProperty("--primary-foreground", "0 0% 100%");
    root.style.setProperty("--ring", hexToHSL(colors.primary_color));
    
    // Secundário
    root.style.setProperty("--secondary", hexToHSL(colors.secondary_color));
    root.style.setProperty("--secondary-foreground", hexToHSL(colors.foreground_color));
    
    // Acento
    root.style.setProperty("--accent", hexToHSL(colors.accent_color));
    root.style.setProperty("--accent-foreground", "0 0% 100%");
    
    // Fundo e texto
    root.style.setProperty("--background", hexToHSL(colors.background_color));
    root.style.setProperty("--foreground", hexToHSL(colors.foreground_color));
    
    // Muted
    root.style.setProperty("--muted", hexToHSL(colors.muted_color));
    root.style.setProperty("--muted-foreground", hexToHSL(colors.foreground_color));
    
    // Destrutivo
    root.style.setProperty("--destructive", hexToHSL(colors.destructive_color));
    root.style.setProperty("--destructive-foreground", "0 0% 100%");
    
    // Cards
    root.style.setProperty("--card", hexToHSL(colors.card_color));
    root.style.setProperty("--card-foreground", hexToHSL(colors.foreground_color));
    root.style.setProperty("--popover", hexToHSL(colors.card_color));
    root.style.setProperty("--popover-foreground", hexToHSL(colors.foreground_color));
    
    // Bordas
    root.style.setProperty("--border", hexToHSL(colors.border_color));
    root.style.setProperty("--input", hexToHSL(colors.border_color));
    
    // Sidebar
    root.style.setProperty("--sidebar-primary", hexToHSL(colors.primary_color));
    root.style.setProperty("--sidebar-ring", hexToHSL(colors.primary_color));
    root.style.setProperty("--sidebar-background", hexToHSL(colors.card_color));
    root.style.setProperty("--sidebar-foreground", hexToHSL(colors.foreground_color));
    root.style.setProperty("--sidebar-border", hexToHSL(colors.border_color));

    // Border radius
    const radiusOption = borderRadiusOptions.find(opt => opt.value === colors.border_radius);
    if (radiusOption) {
      root.style.setProperty("--radius", radiusOption.css);
    }

    // Fonts - add Google Font links dynamically
    if (colors.font_primary) {
      loadGoogleFont(colors.font_primary);
      root.style.setProperty("--font-heading", `"${colors.font_primary}", sans-serif`);
    }
    if (colors.font_secondary) {
      loadGoogleFont(colors.font_secondary);
      root.style.setProperty("--font-body", `"${colors.font_secondary}", sans-serif`);
    }
  };

  const loadGoogleFont = (fontName: string) => {
    const existingLink = document.querySelector(`link[data-font="${fontName}"]`);
    if (existingLink) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`;
    link.dataset.font = fontName;
    document.head.appendChild(link);
  };

  if (loading) {
    return <div className="text-muted-foreground">{t('common.loading')}</div>;
  }

  if (!company) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">{t('settings.noCompany')}</p>
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
            <CardTitle>{t('settings.aiExtraction')}</CardTitle>
          </div>
          <CardDescription>
            {t('settings.aiExtractionDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                      {t('settings.analyzingBrandbook')}
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      {t('settings.uploadBrandbook')}
                    </>
                  )}
                </span>
              </Button>
            </Label>
            <p className="text-sm text-muted-foreground">
              {t('settings.maxFileSize')}
            </p>
          </div>

          {/* Extracted Data Display */}
          {extractedData && (
            <div className="mt-4 space-y-4 rounded-lg border p-4 bg-muted/30">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="font-medium">{t('settings.analysisComplete')}</span>
                <Badge variant={extractedData.confidence === 'high' ? 'default' : extractedData.confidence === 'medium' ? 'secondary' : 'outline'}>
                  {extractedData.confidence === 'high' ? t('settings.confidenceHigh') : extractedData.confidence === 'medium' ? t('settings.confidenceMedium') : t('settings.confidenceLow')}
                </Badge>
              </div>

              {extractedData.brand_name && (
                <div>
                  <span className="text-sm text-muted-foreground">{t('settings.brandIdentified')} </span>
                  <span className="font-medium">{extractedData.brand_name}</span>
                </div>
              )}

              {extractedData.fonts && (extractedData.fonts.primary || extractedData.fonts.secondary) && (
                <div className="flex flex-wrap gap-2">
                  <Type className="h-4 w-4 text-muted-foreground" />
                  {extractedData.fonts.primary && (
                    <Badge variant="outline">{t('settings.titles')}: {extractedData.fonts.primary}</Badge>
                  )}
                  {extractedData.fonts.secondary && (
                    <Badge variant="outline">{t('settings.texts')}: {extractedData.fonts.secondary}</Badge>
                  )}
                </div>
              )}

              {extractedData.style && (
                <div className="flex flex-wrap gap-2">
                  {extractedData.style.visual_tone && (
                    <Badge variant="secondary">{t('settings.tone')}: {extractedData.style.visual_tone}</Badge>
                  )}
                  {extractedData.style.contrast_level && (
                    <Badge variant="secondary">{t('settings.contrast')}: {extractedData.style.contrast_level}</Badge>
                  )}
                </div>
              )}

              {extractedData.design_recommendations && extractedData.design_recommendations.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium">{t('settings.designRecommendations')}</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    {extractedData.design_recommendations.map((rec, index) => (
                      <li key={index} className="list-disc">{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Customization Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <CardTitle>{t('settings.visualCustomization')}</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={handleResetColors}>
              {t('settings.resetAll')}
            </Button>
          </div>
          <CardDescription>
            {t('settings.visualCustomizationDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload */}
          <div className="space-y-3">
            <Label>{t('settings.companyLogo')}</Label>
            <div className="flex items-center gap-4">
              {formData.logo_url ? (
                <div className="relative">
                  <img
                    src={formData.logo_url}
                    alt={t('settings.companyLogo')}
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
                  {t('settings.noLogo')}
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
                      {uploading ? t('settings.uploading') : t('settings.uploadLogo')}
                    </span>
                  </Button>
                </Label>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('settings.logoRecommendation')}
            </p>
          </div>

          <Separator />

          {/* Typography Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              <Label className="text-base font-medium">{t('settings.typography')}</Label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="font_primary">{t('settings.headingFont')}</Label>
                <Select
                  value={formData.font_primary}
                  onValueChange={(value) => handleColorChange("font_primary", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('settings.selectFont')} />
                  </SelectTrigger>
                  <SelectContent>
                    {popularFonts.map((font) => (
                      <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                        {font}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="font_secondary">{t('settings.bodyFont')}</Label>
                <Select
                  value={formData.font_secondary}
                  onValueChange={(value) => handleColorChange("font_secondary", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('settings.selectFont')} />
                  </SelectTrigger>
                  <SelectContent>
                    {popularFonts.map((font) => (
                      <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                        {font}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Border Radius Settings */}
          <div className="space-y-4">
            <Label className="text-base font-medium">{t('settings.cornerRounding')}</Label>
            <div className="flex flex-wrap gap-2">
              {borderRadiusOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={formData.border_radius === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleColorChange("border_radius", option.value)}
                  className="gap-2"
                >
                  <div 
                    className="w-4 h-4 border-2"
                    style={{ 
                      borderRadius: option.value === 'none' ? '0' : 
                                   option.value === 'sm' ? '2px' : 
                                   option.value === 'md' ? '4px' : 
                                   option.value === 'lg' ? '6px' : 
                                   option.value === 'xl' ? '8px' : '50%',
                      borderColor: formData.border_radius === option.value ? 'white' : 'currentColor'
                    }}
                  />
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Color Palette */}
          <div className="space-y-4">
            <Label className="text-base font-medium">{t('settings.colorPalette')}</Label>
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

          {/* Enhanced Preview */}
          <div className="space-y-3">
            <Label className="text-base font-medium">{t('settings.preview')}</Label>
            <div 
              className="rounded-lg p-6 space-y-4"
              style={{ 
                backgroundColor: formData.background_color,
                fontFamily: formData.font_secondary ? `"${formData.font_secondary}", sans-serif` : undefined,
                borderRadius: borderRadiusOptions.find(opt => opt.value === formData.border_radius)?.css || '0.375rem'
              }}
            >
              {/* Header Preview */}
              <div 
                className="p-4 flex items-center gap-4"
                style={{ 
                  backgroundColor: formData.primary_color,
                  borderRadius: borderRadiusOptions.find(opt => opt.value === formData.border_radius)?.css || '0.375rem'
                }}
              >
                {formData.logo_url && (
                  <img
                    src={formData.logo_url}
                    alt="Preview"
                    className="h-10 w-auto max-w-[100px] object-contain"
                  />
                )}
                <span 
                  className="text-white font-semibold"
                  style={{ fontFamily: formData.font_primary ? `"${formData.font_primary}", sans-serif` : undefined }}
                >
                  {extractedData?.brand_name || t('settings.yourCompany')}
                </span>
              </div>
              
              {/* Card Preview */}
              <div 
                className="p-4 space-y-3"
                style={{ 
                  backgroundColor: formData.card_color,
                  borderColor: formData.border_color,
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderRadius: borderRadiusOptions.find(opt => opt.value === formData.border_radius)?.css || '0.375rem'
                }}
              >
                <h3 
                  style={{ 
                    color: formData.foreground_color,
                    fontFamily: formData.font_primary ? `"${formData.font_primary}", sans-serif` : undefined
                  }} 
                  className="font-semibold text-lg"
                >
                  {t('settings.cardTitle')}
                </h3>
                <p style={{ color: formData.muted_color }} className="text-sm">
                  {t('settings.previewText')}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button 
                    className="px-4 py-2 text-white text-sm font-medium transition-colors"
                    style={{ 
                      backgroundColor: formData.primary_color,
                      borderRadius: borderRadiusOptions.find(opt => opt.value === formData.border_radius)?.css || '0.375rem'
                    }}
                  >
                    {t('settings.primaryBtn')}
                  </button>
                  <button 
                    className="px-4 py-2 text-white text-sm font-medium"
                    style={{ 
                      backgroundColor: formData.accent_color,
                      borderRadius: borderRadiusOptions.find(opt => opt.value === formData.border_radius)?.css || '0.375rem'
                    }}
                  >
                    {t('settings.highlightBtn')}
                  </button>
                  <button 
                    className="px-4 py-2 text-sm font-medium border"
                    style={{ 
                      backgroundColor: 'transparent',
                      color: formData.foreground_color,
                      borderColor: formData.border_color,
                      borderRadius: borderRadiusOptions.find(opt => opt.value === formData.border_radius)?.css || '0.375rem'
                    }}
                  >
                    {t('settings.secondaryBtn')}
                  </button>
                  <button 
                    className="px-4 py-2 text-white text-sm font-medium"
                    style={{ 
                      backgroundColor: formData.success_color,
                      borderRadius: borderRadiusOptions.find(opt => opt.value === formData.border_radius)?.css || '0.375rem'
                    }}
                  >
                    {t('settings.successBtn')}
                  </button>
                  <button 
                    className="px-4 py-2 text-white text-sm font-medium"
                    style={{ 
                      backgroundColor: formData.destructive_color,
                      borderRadius: borderRadiusOptions.find(opt => opt.value === formData.border_radius)?.css || '0.375rem'
                    }}
                  >
                    {t('settings.deleteBtn')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            <Save className="mr-2 h-4 w-4" />
            {saving ? t('settings.saving') : t('settings.saveCustomization')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
