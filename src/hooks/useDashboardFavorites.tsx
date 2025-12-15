import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export interface DashboardFavorite {
  id: string;
  dashboard_id: string;
  created_at: string;
}

export const useDashboardFavorites = () => {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchFavorites = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from("user_dashboard_favorites")
        .select("dashboard_id")
        .eq("user_id", user.id);

      if (error) throw error;
      setFavorites(data?.map((f: any) => f.dashboard_id) || []);
    } catch (error: any) {
      console.error("Error fetching favorites:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const toggleFavorite = async (dashboardId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const isFavorite = favorites.includes(dashboardId);

      if (isFavorite) {
        const { error } = await (supabase as any)
          .from("user_dashboard_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("dashboard_id", dashboardId);

        if (error) throw error;
        setFavorites(prev => prev.filter(id => id !== dashboardId));
        toast({
          title: "Removido dos favoritos",
          description: "Dashboard removido dos favoritos",
        });
      } else {
        const { error } = await (supabase as any)
          .from("user_dashboard_favorites")
          .insert({
            user_id: user.id,
            dashboard_id: dashboardId,
          });

        if (error) throw error;
        setFavorites(prev => [...prev, dashboardId]);
        toast({
          title: "Adicionado aos favoritos",
          description: "Dashboard adicionado aos favoritos",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const isFavorite = (dashboardId: string) => favorites.includes(dashboardId);

  return {
    favorites,
    loading,
    toggleFavorite,
    isFavorite,
    refetch: fetchFavorites,
  };
};
