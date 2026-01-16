import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, Star, Filter, Tag, LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface DashboardCatalogFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  categories: string[];
  tags: string[];
  showFavoritesOnly: boolean;
  onFavoritesToggle: () => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
}

export const DashboardCatalogFilters = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedTags,
  onTagToggle,
  categories,
  tags,
  showFavoritesOnly,
  onFavoritesToggle,
  viewMode,
  onViewModeChange,
}: DashboardCatalogFiltersProps) => {
  const { t } = useTranslation();
  const [showAllTags, setShowAllTags] = useState(false);
  const visibleTags = showAllTags ? tags : tags.slice(0, 6);

  return (
    <div className="space-y-4 mb-6">
      {/* Search and Category Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('filters.searchByNameOrDescription')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-background/50"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
              onClick={() => onSearchChange("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Select value={selectedCategory} onValueChange={onCategoryChange}>
            <SelectTrigger className="w-[160px] bg-background/50">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder={t('filters.category')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.allCategories')}</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={showFavoritesOnly ? "default" : "outline"}
            size="icon"
            onClick={onFavoritesToggle}
            className="shrink-0"
            title={showFavoritesOnly ? t('filters.showAll') : t('filters.showFavorites')}
          >
            <Star className={cn("h-4 w-4", showFavoritesOnly && "fill-current")} />
          </Button>

          {/* View Mode Toggle */}
          <div className="flex border border-border rounded-md overflow-hidden">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="icon"
              onClick={() => onViewModeChange("grid")}
              className="rounded-none h-9 w-9"
              title={t('filters.gridView')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              onClick={() => onViewModeChange("list")}
              className="rounded-none h-9 w-9"
              title={t('filters.listView')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tags Row */}
      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          {visibleTags.map((tag) => (
            <Badge
              key={tag}
              variant={selectedTags.includes(tag) ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/20 transition-colors"
              onClick={() => onTagToggle(tag)}
            >
              {tag}
              {selectedTags.includes(tag) && <X className="ml-1 h-3 w-3" />}
            </Badge>
          ))}
          {tags.length > 6 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => setShowAllTags(!showAllTags)}
            >
              {showAllTags ? t('filters.showLess') : t('filters.showMore', { count: tags.length - 6 })}
            </Button>
          )}
        </div>
      )}

      {/* Active Filters Summary */}
      {(selectedCategory !== "all" || selectedTags.length > 0 || showFavoritesOnly) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{t('filters.activeFilters')}</span>
          {showFavoritesOnly && (
            <Badge variant="secondary" className="gap-1">
              <Star className="h-3 w-3 fill-current" />
              {t('filters.favorites')}
            </Badge>
          )}
          {selectedCategory !== "all" && (
            <Badge variant="secondary">{selectedCategory}</Badge>
          )}
          {selectedTags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-destructive"
            onClick={() => {
              onCategoryChange("all");
              selectedTags.forEach((tag) => onTagToggle(tag));
              if (showFavoritesOnly) onFavoritesToggle();
            }}
          >
            {t('filters.clearFilters')}
          </Button>
        </div>
      )}
    </div>
  );
};
