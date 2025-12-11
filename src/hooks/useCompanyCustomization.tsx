import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CompanyCustomization {
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
}

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
        .select("logo_url, primary_color, secondary_color")
        .eq("id", profile.company_id)
        .single();

      if (companyData) {
        setCustomization({
          logo_url: companyData.logo_url,
          primary_color: companyData.primary_color || "#0891b2",
          secondary_color: companyData.secondary_color || "#06b6d4"
        });

        // Apply colors to CSS variables
        applyColors(
          companyData.primary_color || "#0891b2",
          companyData.secondary_color || "#06b6d4"
        );
      }
    }
    setLoading(false);
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

  return { customization, loading, refetch: fetchCustomization };
};
