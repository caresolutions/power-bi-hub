import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Building2, Users, Palette, FileX } from "lucide-react";
import { CompanySettings } from "@/components/settings/CompanySettings";
import { UsersSettings } from "@/components/settings/UsersSettings";
import { CustomizationSettings } from "@/components/settings/CustomizationSettings";
import { CancellationSettings } from "@/components/settings/CancellationSettings";
import { useCompanyCustomization } from "@/hooks/useCompanyCustomization";
import { CompanyFilter } from "@/components/CompanyFilter";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import LanguageSelector from "@/components/LanguageSelector";

const Settings = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const navigate = useNavigate();
  useCompanyCustomization();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (profile?.company_id) {
      setUserCompanyId(profile.company_id);
      setSelectedCompanyId(profile.company_id);
    }

    const { data: isMaster } = await supabase.rpc('is_master_admin', { _user_id: user.id });
    
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    console.log("User roles data:", rolesData);
    console.log("Is master admin (RPC):", isMaster);
    
    const roles = rolesData?.map(r => r.role) || [];
    const hasAdminAccess = roles.includes('admin') || roles.includes('master_admin') || isMaster;
    
    if (!hasAdminAccess) {
      navigate("/home");
      return;
    }

    setIsAdmin(true);
    setIsMasterAdmin(isMaster === true);
    setLoading(false);
  };

  const handleCompanyChange = (companyId: string) => {
    setSelectedCompanyId(companyId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  const effectiveCompanyId = isMasterAdmin ? (selectedCompanyId || null) : userCompanyId;

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-hero opacity-30" />
      
      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-card/80 backdrop-blur-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
            </div>
            
            <div className="flex items-center gap-4">
              {isMasterAdmin && (
                <CompanyFilter
                  value={selectedCompanyId}
                  onChange={handleCompanyChange}
                  showAll={false}
                  allLabel={t('settings.selectCompany')}
                />
              )}
              <LanguageSelector />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 py-8">
        <Tabs defaultValue="company" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings.company')}</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings.users')}</span>
            </TabsTrigger>
            <TabsTrigger value="customization" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings.customization')}</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-2">
              <FileX className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings.subscription')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="company">
            <CompanySettings companyId={effectiveCompanyId} />
          </TabsContent>

          <TabsContent value="users">
            <UsersSettings companyId={effectiveCompanyId} />
          </TabsContent>

          <TabsContent value="customization">
            <CustomizationSettings companyId={effectiveCompanyId} />
          </TabsContent>

          <TabsContent value="subscription">
            <CancellationSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

const SettingsWithGuard = () => {
  const { t } = useTranslation();
  const [checkingRole, setCheckingRole] = useState(true);
  const [isMaster, setIsMaster] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.rpc('is_master_admin', { _user_id: user.id });
        setIsMaster(!!data);
      }
      setCheckingRole(false);
    };
    checkRole();
  }, []);

  if (checkingRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (isMaster) {
    return <Settings />;
  }

  return (
    <SubscriptionGuard>
      <Settings />
    </SubscriptionGuard>
  );
};

export default SettingsWithGuard;
