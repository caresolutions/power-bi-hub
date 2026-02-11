import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Plus, BarChart3, Users, Pencil, Trash2, Mail, RefreshCw, Building2, LayoutGrid, List } from "lucide-react";
import { motion } from "framer-motion";
import DashboardForm from "@/components/dashboards/DashboardForm";
import RefreshPermissionsDialog from "@/components/dashboards/RefreshPermissionsDialog";
import { DashboardCatalogFilters } from "@/components/dashboards/DashboardCatalogFilters";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FavoriteButton } from "@/components/dashboards/FavoriteButton";
import { CompanyFilter } from "@/components/CompanyFilter";
import { useDashboardFavorites } from "@/hooks/useDashboardFavorites";
import { useUserRole } from "@/hooks/useUserRole";
import { useAccessLog } from "@/hooks/useAccessLog";
import { useSubscriptionPlan } from "@/hooks/useSubscriptionPlan";
import { PlanLimitAlert } from "@/components/subscription/PlanLimitAlert";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Dashboard {
  id: string;
  name: string;
  workspace_id: string;
  dashboard_id: string;
  report_section: string | null;
  credential_id: string | null;
  embed_type: string;
  public_link: string | null;
  description?: string | null;
  category?: string | null;
  tags?: string[] | null;
  company_id?: string | null;
  company?: {
    name: string;
  };
}

interface Credential {
  id: string;
  name: string;
}

const Dashboards = () => {
  const { t } = useTranslation();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState<Dashboard | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [refreshPermsDashboard, setRefreshPermsDashboard] = useState<Dashboard | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  
  // Catalog filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    const saved = localStorage.getItem("dashboards-view-mode");
    return saved === "list" ? "list" : "grid";
  });

  // Save view mode preference
  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode);
    localStorage.setItem("dashboards-view-mode", mode);
  };
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useDashboardFavorites();
  const { userId, isMasterAdmin, isAdmin, loading: roleLoading, companyId } = useUserRole();
  const { logDashboardAccess } = useAccessLog();
  const { checkLimit, currentPlan, refetch: refetchPlan } = useSubscriptionPlan();
  
  // Check dashboard limit
  const dashboardLimit = checkLimit("dashboards");

  // Extract unique categories and tags
  const categories = useMemo(() => {
    const cats = dashboards
      .map(d => d.category)
      .filter((c): c is string => !!c);
    return [...new Set(cats)];
  }, [dashboards]);

  const allTags = useMemo(() => {
    const tags = dashboards
      .flatMap(d => d.tags || [])
      .filter((t): t is string => !!t);
    return [...new Set(tags)];
  }, [dashboards]);

  // Filter dashboards based on catalog filters
  const filteredDashboards = useMemo(() => {
    return dashboards.filter(dashboard => {
      // Search filter
      const matchesSearch = !searchQuery.trim() || 
        dashboard.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (dashboard.description?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Category filter
      const matchesCategory = selectedCategory === "all" || 
        dashboard.category === selectedCategory;
      
      // Tags filter
      const matchesTags = selectedTags.length === 0 || 
        selectedTags.some(tag => dashboard.tags?.includes(tag));
      
      // Favorites filter
      const matchesFavorites = !showFavoritesOnly || isFavorite(dashboard.id);
      
      return matchesSearch && matchesCategory && matchesTags && matchesFavorites;
    });
  }, [dashboards, searchQuery, selectedCategory, selectedTags, showFavoritesOnly, isFavorite]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  useEffect(() => {
    if (!roleLoading && userId) {
      fetchDashboards();
      if (isAdmin) {
        fetchCredentials();
      }
    } else if (!roleLoading && !userId) {
      navigate("/auth");
    }
  }, [roleLoading, userId, isAdmin, selectedCompanyId]);

  const fetchDashboards = async () => {
    setLoading(true);
    try {
      if (isMasterAdmin) {
        // Master Admin: fetch all dashboards or filtered by company
        let query = supabase
          .from("dashboards")
          .select("*")
          .order("created_at", { ascending: false });

        if (selectedCompanyId !== "all") {
          query = query.eq("company_id", selectedCompanyId);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Fetch company names
        if (data && data.length > 0) {
          const companyIds = [...new Set(data.map(d => d.company_id).filter(Boolean))];
          if (companyIds.length > 0) {
            const { data: companies } = await supabase
              .from("companies")
              .select("id, name")
              .in("id", companyIds);

            const companyMap = new Map(companies?.map(c => [c.id, c.name]) || []);
            
            const dashboardsWithCompany = data.map(dash => ({
              ...dash,
              company: dash.company_id ? { name: companyMap.get(dash.company_id) || t('dashboards.unknown') } : undefined
            }));
            
            setDashboards(dashboardsWithCompany);
          } else {
            setDashboards(data);
          }
        } else {
          setDashboards(data || []);
        }
      } else if (isAdmin) {
        // Admin: fetch only company dashboards
        const { data, error } = await supabase
          .from("dashboards")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setDashboards(data || []);
      } else {
        // Regular user: fetch only dashboards with access
        const { data: accessData, error: accessError } = await supabase
          .from("user_dashboard_access")
          .select("dashboard_id")
          .eq("user_id", userId);

        if (accessError) throw accessError;

        if (accessData && accessData.length > 0) {
          const dashboardIds = accessData.map(a => a.dashboard_id);
          const { data, error } = await supabase
            .from("dashboards")
            .select("*")
            .in("id", dashboardIds);

          if (error) throw error;
          setDashboards(data || []);
        } else {
          setDashboards([]);
        }
      }
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCredentials = async () => {
    try {
      if (isMasterAdmin) {
        // Master Admin: show global credentials + company-specific credentials
        if (selectedCompanyId !== "all") {
          // Global credentials OR specific company credentials
          const { data, error } = await supabase
            .from("power_bi_configs")
            .select("id, name, company_id")
            .or(`company_id.is.null,company_id.eq.${selectedCompanyId}`)
            .order("name");
          
          if (error) throw error;
          
          // Add indicator for global credentials
          const credentialsWithLabel = (data || []).map(c => ({
            ...c,
            name: c.company_id ? c.name : `🌐 ${c.name} (Global)`
          }));
          setCredentials(credentialsWithLabel);
        } else {
          // All credentials
          const { data, error } = await supabase
            .from("power_bi_configs")
            .select("id, name, company_id")
            .order("name");
          
          if (error) throw error;
          
          const credentialsWithLabel = (data || []).map(c => ({
            ...c,
            name: c.company_id ? c.name : `🌐 ${c.name} (Global)`
          }));
          setCredentials(credentialsWithLabel);
        }
      } else {
        // Regular admin: company credentials + global credentials
        const { data, error } = await supabase
          .from("power_bi_configs")
          .select("id, name, company_id")
          .order("name");
        
        if (error) throw error;
        
        // Filter: company credentials + global credentials
        const filtered = (data || []).filter(c => !c.company_id || c.company_id === companyId);
        const credentialsWithLabel = filtered.map(c => ({
          ...c,
          name: c.company_id ? c.name : `🌐 ${c.name} (Global)`
        }));
        setCredentials(credentialsWithLabel);
      }
    } catch (error: any) {
      console.error("Error fetching credentials:", error);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      const { error } = await supabase
        .from("dashboards")
        .delete()
        .eq("id", deletingId);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('dashboards.removed'),
      });
      
      fetchDashboards();
      refetchPlan();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDashboardClick = async (dashboard: Dashboard) => {
    logDashboardAccess(dashboard.id);
    
    if (dashboard.embed_type === "app") {
      // Fetch first child dashboard of the app
      const { data } = await supabase
        .from("dashboard_app_items")
        .select("child_dashboard_id")
        .eq("app_dashboard_id", dashboard.id)
        .order("display_order")
        .limit(1)
        .maybeSingle();

      if (data) {
        navigate(`/dashboard/${data.child_dashboard_id}?app=${dashboard.id}`);
      } else {
        toast({
          title: "App vazio",
          description: "Este App não possui dashboards configurados",
          variant: "destructive",
        });
      }
    } else {
      navigate(`/dashboard/${dashboard.id}`);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingDashboard(null);
    fetchDashboards();
    refetchPlan(); // Refresh usage counts
  };

  const handleNewDashboard = () => {
    if (!dashboardLimit.allowed && !dashboardLimit.isUnlimited) {
      toast({
        title: t('dashboards.limitReached'),
        description: t('dashboards.limitReachedDesc', { limit: dashboardLimit.limit, plan: currentPlan?.name || t('dashboards.currentPlan') }),
        variant: "destructive",
      });
      return;
    }
    setShowForm(true);
  };

  const getCredentialName = (credentialId: string | null) => {
    if (!credentialId) return t('dashboards.notLinked');
    const credential = credentials.find(c => c.id === credentialId);
    return credential?.name || t('dashboards.notFound');
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-hero opacity-30" />
      
      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-card/30 backdrop-blur">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate("/home")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('common.back')}
              </Button>
              <div className="flex items-center gap-3">
                <div className="bg-accent/10 p-2 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-accent" />
                </div>
                <h1 className="text-2xl font-bold">{t('dashboards.catalog')}</h1>
              </div>
            </div>
            
            {isAdmin && !showForm && (
              <Button
                onClick={handleNewDashboard}
                className="bg-primary hover:bg-primary/90 shadow-glow"
                disabled={!dashboardLimit.allowed && !dashboardLimit.isUnlimited}
              >
                <Plus className="mr-2 h-5 w-5" />
                {t('dashboards.newDashboard')}
                {!dashboardLimit.isUnlimited && (
                  <Badge variant="secondary" className="ml-2">
                    {dashboardLimit.current}/{dashboardLimit.limit}
                  </Badge>
                )}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 py-12">
        {showForm || editingDashboard ? (
          <DashboardForm 
            dashboard={editingDashboard}
            credentials={credentials}
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setShowForm(false);
              setEditingDashboard(null);
            }}
            isMasterAdmin={isMasterAdmin}
            defaultCompanyId={isMasterAdmin ? (selectedCompanyId !== "all" ? selectedCompanyId : undefined) : companyId || undefined}
          />
        ) : (
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
              <h2 className="text-3xl font-bold mb-2">
                {isMasterAdmin ? t('dashboards.allDashboards') : isAdmin ? t('dashboards.myDashboards') : t('dashboards.availableDashboards')}
              </h2>
              <p className="text-muted-foreground">
                {isMasterAdmin 
                  ? t('dashboards.manageAllCompanies')
                  : isAdmin 
                    ? t('dashboards.manageAndShare')
                    : t('dashboards.viewAccessible')}
              </p>
            </div>

              {/* Company Filter for Master Admin */}
              {isMasterAdmin && (
                <CompanyFilter
                  value={selectedCompanyId}
                  onChange={(value) => {
                    setSelectedCompanyId(value);
                    setLoading(true);
                  }}
                />
              )}
            </div>

            {/* Catalog Filters */}
            {!loading && dashboards.length > 0 && (
              <DashboardCatalogFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                selectedTags={selectedTags}
                onTagToggle={handleTagToggle}
                categories={categories}
                tags={allTags}
                showFavoritesOnly={showFavoritesOnly}
                onFavoritesToggle={() => setShowFavoritesOnly(!showFavoritesOnly)}
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
              />
            )}

            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">{t('common.loading')}</p>
              </div>
            ) : dashboards.length === 0 ? (
              <Card className="glass p-12 text-center border-border/50">
                <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-2xl font-bold mb-2">{t('dashboards.noDashboards')}</h3>
                <p className="text-muted-foreground mb-6">
                  {isMasterAdmin && selectedCompanyId !== "all"
                    ? t('dashboards.noCompanyDashboards')
                    : isAdmin 
                      ? t('dashboards.addFirst')
                      : t('dashboards.noAccess')}
                </p>
                {isAdmin && (
                  <Button
                    onClick={() => setShowForm(true)}
                    className="bg-primary hover:bg-primary/90 shadow-glow"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    {t('dashboards.addDashboard')}
                  </Button>
                )}
              </Card>
            ) : filteredDashboards.length === 0 ? (
              <Card className="glass p-12 text-center border-border/50">
                <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-2xl font-bold mb-2">{t('dashboards.noResults')}</h3>
                <p className="text-muted-foreground">
                  {t('dashboards.adjustFilters')}
                </p>
              </Card>
            ) : viewMode === "grid" ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDashboards.map((dashboard, index) => (
                  <motion.div
                    key={dashboard.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card 
                      className="glass border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-glow cursor-pointer overflow-hidden"
                      onClick={() => handleDashboardClick(dashboard)}
                    >
                      {/* Thumbnail Preview */}
                      <div className="relative h-32 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
                        <BarChart3 className="h-12 w-12 text-primary/40" />
                        
                        {/* Badges */}
                        <div className="absolute top-2 right-2 flex gap-2">
                          {dashboard.embed_type === "public_link" && (
                            <span className="bg-primary/90 text-primary-foreground text-xs px-2 py-1 rounded-full">
                              {t('dashboards.publicLink')}
                            </span>
                          )}
                          {dashboard.embed_type === "app" && (
                            <span className="bg-primary/90 text-primary-foreground text-xs px-2 py-1 rounded-full">
                              App
                            </span>
                          )}
                          {dashboard.embed_type === "slider" && (
                            <span className="bg-primary/90 text-primary-foreground text-xs px-2 py-1 rounded-full">
                              Slider
                            </span>
                          )}
                          {dashboard.category && (
                            <span className="bg-accent/90 text-accent-foreground text-xs px-2 py-1 rounded-full">
                              {dashboard.category}
                            </span>
                          )}
                        </div>
                        
                        {/* Favorite button */}
                        <div className="absolute top-2 left-2">
                          <FavoriteButton
                            isFavorite={isFavorite(dashboard.id)}
                            onClick={() => toggleFavorite(dashboard.id)}
                            size="sm"
                            className="bg-background/80 hover:bg-background"
                          />
                        </div>
                      </div>
                      
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-lg font-bold line-clamp-2">{dashboard.name}</h3>
                          {isAdmin && (
                            <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setEditingDashboard(dashboard)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setDeletingId(dashboard.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Company badge for Master Admin */}
                        {isMasterAdmin && dashboard.company && (
                          <Badge variant="outline" className="mb-2 flex items-center gap-1 w-fit">
                            <Building2 className="h-3 w-3" />
                            {dashboard.company.name}
                          </Badge>
                        )}
                        
                        {dashboard.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {dashboard.description}
                          </p>
                        )}
                        
                        {/* Tags */}
                        {dashboard.tags && dashboard.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {dashboard.tags.slice(0, 3).map(tag => (
                              <span 
                                key={tag} 
                                className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground"
                              >
                                {tag}
                              </span>
                            ))}
                            {dashboard.tags.length > 3 && (
                              <span className="text-xs px-2 py-0.5 text-muted-foreground">
                                +{dashboard.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                        
                        <div className="space-y-1 text-xs text-muted-foreground">
                          {dashboard.embed_type !== "public_link" && (
                            <p className="truncate font-mono">WS: {dashboard.workspace_id.substring(0, 12)}...</p>
                          )}
                          {isAdmin && dashboard.embed_type !== "public_link" && (
                            <p>
                              {t('dashboards.credential')}: <span className="text-primary">{getCredentialName(dashboard.credential_id)}</span>
                            </p>
                          )}
                        </div>
                        
                        {isAdmin && (
                          <div className="flex flex-wrap gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/users?dashboard=${dashboard.id}`);
                              }}
                            >
                              <Users className="mr-2 h-4 w-4" />
                              {t('dashboards.access')}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/dashboard/${dashboard.id}/subscriptions`);
                              }}
                            >
                              <Mail className="mr-2 h-4 w-4" />
                              {t('dashboards.subscriptions')}
                            </Button>
                            {dashboard.embed_type === "workspace_id" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRefreshPermsDashboard(dashboard);
                                }}
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                {t('dashboards.refresh')}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              /* List View */
              <Card className="glass border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/50">
                      <TableHead className="w-10"></TableHead>
                      <TableHead>{t('common.name')}</TableHead>
                      {isMasterAdmin && <TableHead>{t('dashboards.company')}</TableHead>}
                      <TableHead className="hidden md:table-cell">{t('dashboards.category')}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t('dashboards.tags')}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('dashboards.type')}</TableHead>
                      {isAdmin && <TableHead className="text-right">{t('common.actions')}</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDashboards.map((dashboard) => (
                      <TableRow 
                        key={dashboard.id}
                        className="cursor-pointer hover:bg-muted/50 border-border/50"
                        onClick={() => handleDashboardClick(dashboard)}
                      >
                        <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                          <FavoriteButton
                            isFavorite={isFavorite(dashboard.id)}
                            onClick={() => toggleFavorite(dashboard.id)}
                            size="sm"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
                              <BarChart3 className="h-5 w-5 text-primary/60" />
                            </div>
                            <div>
                              <p className="font-medium line-clamp-1">{dashboard.name}</p>
                              {dashboard.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
                                  {dashboard.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        {isMasterAdmin && (
                          <TableCell>
                            {dashboard.company ? (
                              <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                <Building2 className="h-3 w-3" />
                                {dashboard.company.name}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="hidden md:table-cell">
                          {dashboard.category ? (
                            <Badge variant="secondary">{dashboard.category}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {dashboard.tags && dashboard.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {dashboard.tags.slice(0, 2).map(tag => (
                                <span 
                                  key={tag} 
                                  className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground"
                                >
                                  {tag}
                                </span>
                              ))}
                              {dashboard.tags.length > 2 && (
                                <span className="text-xs text-muted-foreground">
                                  +{dashboard.tags.length - 2}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant={dashboard.embed_type === "public_link" || dashboard.embed_type === "app" ? "default" : "outline"}>
                            {dashboard.embed_type === "public_link" 
                              ? t('dashboards.publicLink') 
                              : dashboard.embed_type === "app"
                              ? "App"
                              : dashboard.embed_type === "slider"
                              ? "Slider"
                              : t('dashboards.workspace')}
                          </Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => navigate(`/users?dashboard=${dashboard.id}`)}
                                title={t('dashboards.manageAccess')}
                              >
                                <Users className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => navigate(`/dashboard/${dashboard.id}/subscriptions`)}
                                title={t('dashboards.subscriptions')}
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                              {dashboard.embed_type === "workspace_id" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setRefreshPermsDashboard(dashboard)}
                                  title={t('dashboards.refreshPerms')}
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setEditingDashboard(dashboard)}
                                title={t('common.edit')}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setDeletingId(dashboard.id)}
                                title={t('common.delete')}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </>
        )}
      </main>

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dashboards.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dashboards.deleteWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Refresh Permissions Dialog */}
      {refreshPermsDashboard && (
        <RefreshPermissionsDialog
          dashboardId={refreshPermsDashboard.id}
          dashboardName={refreshPermsDashboard.name}
          open={!!refreshPermsDashboard}
          onOpenChange={(open) => !open && setRefreshPermsDashboard(null)}
        />
      )}
    </div>
  );
};

const DashboardsWithGuard = () => {
  const { t } = useTranslation();
  const { isMasterAdmin, loading } = useUserRole();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (isMasterAdmin) {
    return <Dashboards />;
  }

  return (
    <SubscriptionGuard>
      <Dashboards />
    </SubscriptionGuard>
  );
};

export default DashboardsWithGuard;
