import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Eye, EyeOff, GripVertical, Settings2, Lock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageRestrictionsDialog } from "./PageRestrictionsDialog";

interface PageVisibility {
  id?: string;
  page_name: string;
  page_display_name: string;
  is_visible: boolean;
  display_order: number;
  restriction_count?: number;
  restriction_mode?: string;
}

interface ReportPage {
  name: string;
  displayName: string;
  isActive?: boolean;
}

interface PageVisibilityManagerProps {
  dashboardId: string;
  pages: ReportPage[];
  onVisibilityChange?: () => void;
}

export const PageVisibilityManager = ({
  dashboardId,
  pages,
  onVisibilityChange,
}: PageVisibilityManagerProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pageVisibility, setPageVisibility] = useState<PageVisibility[]>([]);
  const [companyId, setCompanyId] = useState<string>("");
  const [restrictionPage, setRestrictionPage] = useState<PageVisibility | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && pages.length > 0) {
      loadVisibility();
    }
  }, [open, pages]);

  const loadVisibility = async () => {
    setLoading(true);
    try {
      // Load company_id for the dashboard
      const { data: dashData } = await supabase
        .from("dashboards")
        .select("company_id")
        .eq("id", dashboardId)
        .maybeSingle();
      setCompanyId(dashData?.company_id || "");

      const { data, error } = await supabase
        .from("dashboard_page_visibility")
        .select("*")
        .eq("dashboard_id", dashboardId);

      if (error) throw error;

      // Load restriction counts per visibility row
      const visibilityIds = (data || []).map((d) => d.id);
      let countMap = new Map<string, number>();
      if (visibilityIds.length > 0) {
        const [{ data: userR }, { data: groupR }] = await Promise.all([
          supabase
            .from("dashboard_page_user_restrictions")
            .select("page_visibility_id")
            .in("page_visibility_id", visibilityIds),
          supabase
            .from("dashboard_page_group_restrictions")
            .select("page_visibility_id")
            .in("page_visibility_id", visibilityIds),
        ]);
        [...(userR || []), ...(groupR || [])].forEach((r: any) => {
          countMap.set(
            r.page_visibility_id,
            (countMap.get(r.page_visibility_id) || 0) + 1
          );
        });
      }

      const merged: PageVisibility[] = pages.map((page, index) => {
        const saved = data?.find((d) => d.page_name === page.name);
        return {
          id: saved?.id,
          page_name: page.name,
          page_display_name: page.displayName,
          is_visible: saved?.is_visible ?? true,
          display_order: saved?.display_order ?? index,
          restriction_count: saved?.id ? countMap.get(saved.id) || 0 : 0,
        };
      });

      merged.sort((a, b) => a.display_order - b.display_order);
      setPageVisibility(merged);
    } catch (error: any) {
      console.error("Error loading visibility:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as configurações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleVisibility = (pageName: string) => {
    setPageVisibility((prev) =>
      prev.map((p) =>
        p.page_name === pageName ? { ...p, is_visible: !p.is_visible } : p
      )
    );
  };

  const upsertSingleVisibility = async (page: PageVisibility): Promise<string | null> => {
    const { data, error } = await supabase
      .from("dashboard_page_visibility")
      .upsert(
        {
          dashboard_id: dashboardId,
          page_name: page.page_name,
          page_display_name: page.page_display_name,
          is_visible: page.is_visible,
          display_order: page.display_order,
        },
        { onConflict: "dashboard_id,page_name" }
      )
      .select("id")
      .single();

    if (error) {
      console.error(error);
      return null;
    }
    // Update local state with new id
    setPageVisibility((prev) =>
      prev.map((p) => (p.page_name === page.page_name ? { ...p, id: data.id } : p))
    );
    return data.id;
  };

  const openRestrictions = (page: PageVisibility) => {
    setRestrictionPage(page);
  };

  const saveVisibility = async () => {
    setSaving(true);
    try {
      const upsertData = pageVisibility.map((p, index) => ({
        dashboard_id: dashboardId,
        page_name: p.page_name,
        page_display_name: p.page_display_name,
        is_visible: p.is_visible,
        display_order: index,
      }));

      const { error } = await supabase
        .from("dashboard_page_visibility")
        .upsert(upsertData, { onConflict: "dashboard_id,page_name" });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso",
      });

      onVisibilityChange?.();
      setOpen(false);
    } catch (error: any) {
      console.error("Error saving visibility:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar as configurações",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const visibleCount = pageVisibility.filter((p) => p.is_visible).length;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
            <Settings2 className="h-3 w-3" />
            <span className="hidden sm:inline">Páginas</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar Páginas Visíveis</DialogTitle>
            <DialogDescription>
              Escolha quais páginas serão exibidas e quem pode ver cada uma
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {visibleCount} de {pageVisibility.length} páginas visíveis
              </div>

              <div className="space-y-2 max-h-[300px] overflow-auto">
                {pageVisibility.map((page) => (
                  <div
                    key={page.page_name}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-sm truncate">
                          {page.page_display_name}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {(page.restriction_count ?? 0) > 0
                            ? `Restrito a ${page.restriction_count} usuário(s)/grupo(s)`
                            : page.page_name}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Quem pode ver"
                        disabled={!page.is_visible}
                        onClick={() => openRestrictions(page)}
                      >
                        <Lock
                          className={`h-3.5 w-3.5 ${
                            (page.restriction_count ?? 0) > 0
                              ? "text-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                      </Button>
                      {page.is_visible ? (
                        <Eye className="h-4 w-4 text-primary" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Switch
                        checked={page.is_visible}
                        onCheckedChange={() => toggleVisibility(page.page_name)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={saveVisibility} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {restrictionPage && (
        <PageRestrictionsDialog
          open={!!restrictionPage}
          onOpenChange={(o) => {
            if (!o) {
              setRestrictionPage(null);
              // Reload counts
              loadVisibility();
            }
          }}
          dashboardId={dashboardId}
          companyId={companyId}
          pageName={restrictionPage.page_name}
          pageDisplayName={restrictionPage.page_display_name}
          pageVisibilityId={restrictionPage.id}
          ensureVisibilityRow={() => upsertSingleVisibility(restrictionPage)}
        />
      )}
    </>
  );
};
