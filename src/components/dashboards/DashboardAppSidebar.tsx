import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";

interface AppItem {
  id: string;
  child_dashboard_id: string;
  display_order: number;
  dashboard_name: string;
}

interface DashboardAppSidebarProps {
  appDashboardId: string;
  activeDashboardId: string;
  appName: string;
}

const SIDEBAR_COLLAPSED_KEY = "app-sidebar-collapsed";

const DashboardAppSidebar = ({
  appDashboardId,
  activeDashboardId,
  appName,
}: DashboardAppSidebarProps) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<AppItem[]>([]);
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  });

  useEffect(() => {
    fetchItems();
  }, [appDashboardId]);

  const fetchItems = async () => {
    const { data } = await supabase
      .from("dashboard_app_items")
      .select("id, child_dashboard_id, display_order")
      .eq("app_dashboard_id", appDashboardId)
      .order("display_order");

    if (data && data.length > 0) {
      const dashboardIds = data.map((d) => d.child_dashboard_id);
      const { data: dashboards } = await supabase
        .from("dashboards")
        .select("id, name")
        .in("id", dashboardIds);

      const nameMap = new Map(dashboards?.map((d) => [d.id, d.name]) || []);

      setItems(
        data.map((item) => ({
          ...item,
          dashboard_name: nameMap.get(item.child_dashboard_id) || "Dashboard",
        }))
      );
    }
  };

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
  };

  const handleNavigate = (childDashboardId: string) => {
    navigate(`/dashboard/${childDashboardId}?app=${appDashboardId}`);
  };

  return (
    <div
      className={cn(
        "flex-shrink-0 border-r border-border bg-card/50 flex flex-col transition-all duration-200",
        collapsed ? "w-10" : "w-52"
      )}
    >
      {/* Header */}
      {!collapsed && (
        <div className="px-3 py-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            <span className="text-xs font-semibold truncate">{appName}</span>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="flex-1 overflow-y-auto py-1">
        {items.map((item) => {
          const isActive = item.child_dashboard_id === activeDashboardId;
          return (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.child_dashboard_id)}
              className={cn(
                "w-full text-left px-3 py-2 text-xs transition-colors truncate",
                isActive
                  ? "bg-primary/10 text-primary font-medium border-l-2 border-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border-l-2 border-transparent"
              )}
              title={item.dashboard_name}
            >
              {collapsed ? (
                <span className="block w-4 h-4 rounded bg-primary/20 mx-auto" />
              ) : (
                item.dashboard_name
              )}
            </button>
          );
        })}
      </div>

      {/* Collapse toggle */}
      <div className="border-t border-border/50 p-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-xs"
          onClick={toggleCollapsed}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <>
              <ChevronLeft className="h-3 w-3 mr-1" />
              Recolher
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default DashboardAppSidebar;
