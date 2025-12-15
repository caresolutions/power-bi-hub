import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export interface DashboardBookmark {
  id: string;
  dashboard_id: string;
  name: string;
  bookmark_state: any;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export const useDashboardBookmarks = (dashboardId: string) => {
  const [bookmarks, setBookmarks] = useState<DashboardBookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchBookmarks = useCallback(async () => {
    if (!dashboardId) return;

    try {
      const { data, error } = await (supabase as any)
        .from("user_dashboard_bookmarks")
        .select("*")
        .eq("dashboard_id", dashboardId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBookmarks((data as DashboardBookmark[]) || []);
    } catch (error: any) {
      console.error("Error fetching bookmarks:", error);
    } finally {
      setLoading(false);
    }
  }, [dashboardId]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  const createBookmark = async (name: string, bookmarkState: any, isShared: boolean = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await (supabase as any)
        .from("user_dashboard_bookmarks")
        .insert({
          user_id: user.id,
          dashboard_id: dashboardId,
          name,
          bookmark_state: bookmarkState,
          is_shared: isShared,
        })
        .select()
        .single();

      if (error) throw error;

      setBookmarks(prev => [data as DashboardBookmark, ...prev]);
      toast({
        title: "Visualização salva",
        description: `"${name}" foi salva com sucesso`,
      });

      return data;
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const updateBookmark = async (id: string, updates: Partial<DashboardBookmark>) => {
    try {
      const { error } = await (supabase as any)
        .from("user_dashboard_bookmarks")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      setBookmarks(prev =>
        prev.map(b => (b.id === id ? { ...b, ...updates } : b))
      );

      toast({
        title: "Visualização atualizada",
        description: "Alterações salvas com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteBookmark = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from("user_dashboard_bookmarks")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setBookmarks(prev => prev.filter(b => b.id !== id));
      toast({
        title: "Visualização removida",
        description: "Visualização excluída com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    bookmarks,
    loading,
    createBookmark,
    updateBookmark,
    deleteBookmark,
    refetch: fetchBookmarks,
  };
};
