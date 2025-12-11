import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Palette, Upload, Save, X } from "lucide-react";

interface CompanyCustomization {
  id: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
}

export const CustomizationSettings = () => {
  const [company, setCompany] = useState<CompanyCustomization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    logo_url: "",
    primary_color: "#0891b2",
    secondary_color: "#06b6d4"
  });
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
        .select("id, logo_url, primary_color, secondary_color")
        .eq("id", profile.company_id)
        .single();

      if (companyData) {
        setCompany(companyData);
        setFormData({
          logo_url: companyData.logo_url || "",
          primary_color: companyData.primary_color || "#0891b2",
          secondary_color: companyData.secondary_color || "#06b6d4"
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

  const handleRemoveLogo = () => {
    setFormData({ ...formData, logo_url: "" });
  };

  const handleSave = async () => {
    if (!company) return;
    
    setSaving(true);
    const { error } = await supabase
      .from("companies")
      .update({
        logo_url: formData.logo_url || null,
        primary_color: formData.primary_color,
        secondary_color: formData.secondary_color
      })
      .eq("id", company.id);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações",
        variant: "destructive",
      });
    } else {
      // Apply colors immediately
      applyColors(formData.primary_color, formData.secondary_color);
      
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

  const applyColors = (primaryHex: string, secondaryHex: string) => {
    const root = document.documentElement;
    const primaryHSL = hexToHSL(primaryHex);
    const secondaryHSL = hexToHSL(secondaryHex);

    root.style.setProperty("--primary", primaryHSL);
    root.style.setProperty("--ring", primaryHSL);
    root.style.setProperty("--sidebar-primary", primaryHSL);
    root.style.setProperty("--sidebar-ring", primaryHSL);
    root.style.setProperty("--accent", secondaryHSL);
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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <CardTitle>Personalização Visual</CardTitle>
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

        {/* Colors */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="primary-color">Cor Primária</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                id="primary-color"
                value={formData.primary_color}
                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={formData.primary_color}
                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                className="flex-1"
                placeholder="#0891b2"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="secondary-color">Cor Secundária</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                id="secondary-color"
                value={formData.secondary_color}
                onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={formData.secondary_color}
                onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                className="flex-1"
                placeholder="#06b6d4"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <Label>Pré-visualização</Label>
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
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Salvando..." : "Salvar Personalização"}
        </Button>
      </CardContent>
    </Card>
  );
};
