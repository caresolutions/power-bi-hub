import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LayoutGrid, Search, GripVertical } from "lucide-react";

interface AppItem {
  dashboard_id: string;
  name: string;
  display_order: number;
}

interface DashboardAppItemsManagerProps {
  items: AppItem[];
  onItemsChange: (items: AppItem[]) => void;
  companyId: string;
  excludeDashboardId?: string;
}

interface AvailableDashboard {
  id: string;
  name: string;
  category: string | null;
  embed_type: string;
}

const DashboardAppItemsManager = ({
  items,
  onItemsChange,
  companyId,
  excludeDashboardId,
}: DashboardAppItemsManagerProps) => {
  const [availableDashboards, setAvailableDashboards] = useState<AvailableDashboard[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (companyId) {
      fetchDashboards();
    }
  }, [companyId]);

  const fetchDashboards = async () => {
    setLoading(true);
    let query = supabase
      .from("dashboards")
      .select("id, name, category, embed_type")
      .eq("company_id", companyId)
      .neq("embed_type", "app")
      .order("name");

    if (excludeDashboardId) {
      query = query.neq("id", excludeDashboardId);
    }

    const { data } = await query;
    setAvailableDashboards(data || []);
    setLoading(false);
  };

  const isSelected = (dashboardId: string) =>
    items.some((item) => item.dashboard_id === dashboardId);

  const handleToggle = (dashboard: AvailableDashboard) => {
    if (isSelected(dashboard.id)) {
      onItemsChange(items.filter((item) => item.dashboard_id !== dashboard.id));
    } else {
      onItemsChange([
        ...items,
        {
          dashboard_id: dashboard.id,
          name: dashboard.name,
          display_order: items.length + 1,
        },
      ]);
    }
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === items.length - 1)
    )
      return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const updated = [...items];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onItemsChange(
      updated.map((item, i) => ({ ...item, display_order: i + 1 }))
    );
  };

  const filteredDashboards = availableDashboards.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <LayoutGrid className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Dashboards do App</h3>
        {items.length > 0 && (
          <Badge variant="secondary">{items.length} selecionado(s)</Badge>
        )}
      </div>

      {/* Selected items with ordering */}
      {items.length > 0 && (
        <div className="space-y-1 p-3 rounded-lg bg-muted/30 border border-border/50">
          <Label className="text-xs text-muted-foreground mb-2 block">
            Ordem de exibição na sidebar
          </Label>
          {items.map((item, index) => (
            <div
              key={item.dashboard_id}
              className="flex items-center gap-2 py-1.5 px-2 rounded bg-background/50"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-xs text-muted-foreground w-5">
                {index + 1}
              </span>
              <span className="text-sm flex-1 truncate">{item.name}</span>
              <div className="flex gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => moveItem(index, "up")}
                  disabled={index === 0}
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => moveItem(index, "down")}
                  disabled={index === items.length - 1}
                >
                  ↓
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Available dashboards */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar dashboards..."
            className="pl-8 bg-background/50"
          />
        </div>

        <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Carregando...
            </p>
          ) : filteredDashboards.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {search ? "Nenhum dashboard encontrado" : "Nenhum dashboard disponível"}
            </p>
          ) : (
            filteredDashboards.map((dashboard) => (
              <label
                key={dashboard.id}
                className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox
                  checked={isSelected(dashboard.id)}
                  onCheckedChange={() => handleToggle(dashboard)}
                />
                <span className="text-sm flex-1 truncate">{dashboard.name}</span>
                {dashboard.category && (
                  <Badge variant="outline" className="text-xs">
                    {dashboard.category}
                  </Badge>
                )}
              </label>
            ))
          )}
        </div>
      </div>

      {items.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Selecione os dashboards que farão parte deste App
        </p>
      )}
    </div>
  );
};

export default DashboardAppItemsManager;
