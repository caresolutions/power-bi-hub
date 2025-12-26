import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CompanyCustomization {
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

const borderRadiusMap: Record<string, string> = {
  'none': '0',
  'sm': '0.125rem',
  'md': '0.375rem',
  'lg': '0.5rem',
  'xl': '0.75rem',
  'full': '9999px',
};

// Convert hex to HSL
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

const loadGoogleFont = (fontName: string) => {
  const existingLink = document.querySelector(`link[data-font="${fontName}"]`);
  if (existingLink) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`;
  link.dataset.font = fontName;
  document.head.appendChild(link);
};

export const useCompanyCustomization = () => {
  const [customization, setCustomization] = useState<CompanyCustomization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomization();
  }, []);

  const fetchCustomization = async () => {
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

    if (profile?.company_id) {
      const { data: companyData } = await supabase
        .from("companies")
        .select("logo_url, primary_color, secondary_color, accent_color, background_color, foreground_color, muted_color, destructive_color, success_color, card_color, border_color, font_primary, font_secondary, border_radius")
        .eq("id", profile.company_id)
        .single();

      if (companyData) {
        setCustomization({
          logo_url: companyData.logo_url,
          primary_color: companyData.primary_color || "#0891b2",
          secondary_color: companyData.secondary_color || "#06b6d4",
          accent_color: companyData.accent_color || "#0ea5e9",
          background_color: companyData.background_color || "#ffffff",
          foreground_color: companyData.foreground_color || "#0f172a",
          muted_color: companyData.muted_color || "#94a3b8",
          destructive_color: companyData.destructive_color || "#ef4444",
          success_color: companyData.success_color || "#22c55e",
          card_color: companyData.card_color || "#ffffff",
          border_color: companyData.border_color || "#e2e8f0",
          font_primary: companyData.font_primary || null,
          font_secondary: companyData.font_secondary || null,
          border_radius: companyData.border_radius || "md",
        });

        // Apply colors to CSS variables
        applyColors(companyData);
      }
    }
    setLoading(false);
  };

  const applyColors = (colors: any) => {
    const root = document.documentElement;
    
    const primaryHSL = hexToHSL(colors.primary_color || "#0891b2");
    const secondaryHSL = hexToHSL(colors.secondary_color || "#06b6d4");
    const accentHSL = hexToHSL(colors.accent_color || "#0ea5e9");
    const backgroundHSL = hexToHSL(colors.background_color || "#ffffff");
    const foregroundHSL = hexToHSL(colors.foreground_color || "#0f172a");
    const mutedHSL = hexToHSL(colors.muted_color || "#94a3b8");
    const destructiveHSL = hexToHSL(colors.destructive_color || "#ef4444");
    const cardHSL = hexToHSL(colors.card_color || "#ffffff");
    const borderHSL = hexToHSL(colors.border_color || "#e2e8f0");

    // Cores principais
    root.style.setProperty("--primary", primaryHSL);
    root.style.setProperty("--primary-foreground", "0 0% 100%");
    root.style.setProperty("--ring", primaryHSL);
    
    // Secundário
    root.style.setProperty("--secondary", secondaryHSL);
    root.style.setProperty("--secondary-foreground", foregroundHSL);
    
    // Acento
    root.style.setProperty("--accent", accentHSL);
    root.style.setProperty("--accent-foreground", "0 0% 100%");
    
    // Fundo e texto
    root.style.setProperty("--background", backgroundHSL);
    root.style.setProperty("--foreground", foregroundHSL);
    
    // Muted
    root.style.setProperty("--muted", mutedHSL);
    root.style.setProperty("--muted-foreground", foregroundHSL);
    
    // Destrutivo
    root.style.setProperty("--destructive", destructiveHSL);
    root.style.setProperty("--destructive-foreground", "0 0% 100%");
    
    // Cards
    root.style.setProperty("--card", cardHSL);
    root.style.setProperty("--card-foreground", foregroundHSL);
    root.style.setProperty("--popover", cardHSL);
    root.style.setProperty("--popover-foreground", foregroundHSL);
    
    // Bordas
    root.style.setProperty("--border", borderHSL);
    root.style.setProperty("--input", borderHSL);
    
    // Sidebar
    root.style.setProperty("--sidebar-primary", primaryHSL);
    root.style.setProperty("--sidebar-ring", primaryHSL);
    root.style.setProperty("--sidebar-background", cardHSL);
    root.style.setProperty("--sidebar-foreground", foregroundHSL);
    root.style.setProperty("--sidebar-border", borderHSL);

    // Border radius
    const borderRadius = colors.border_radius || 'md';
    const radiusCss = borderRadiusMap[borderRadius] || '0.375rem';
    root.style.setProperty("--radius", radiusCss);

    // Fonts
    if (colors.font_primary) {
      loadGoogleFont(colors.font_primary);
      root.style.setProperty("--font-heading", `"${colors.font_primary}", sans-serif`);
    }
    if (colors.font_secondary) {
      loadGoogleFont(colors.font_secondary);
      root.style.setProperty("--font-body", `"${colors.font_secondary}", sans-serif`);
    }
  };

  return { customization, loading, refetch: fetchCustomization };
};
