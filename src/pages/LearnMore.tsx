import { useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check, X, BarChart3, Shield, Users, Zap, Monitor, Database } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import careLogo from "@/assets/logo_care_azul.png";
import LanguageSelector from "@/components/LanguageSelector";

interface PlanFeature {
  feature_key: string;
  feature_description: string;
  is_enabled: boolean;
}

interface PlanLimit {
  limit_key: string;
  limit_value: number | null;
  is_unlimited: boolean;
}

interface Plan {
  id: string;
  name: string;
  plan_key: string;
  description: string;
  price_monthly: number;
  price_additional_user: number | null;
  is_custom: boolean;
  display_order: number;
}

const LearnMore = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  // Reset to default colors
  useEffect(() => {
    const root = document.documentElement;
    root.style.removeProperty("--primary");
    root.style.removeProperty("--ring");
    root.style.removeProperty("--sidebar-primary");
    root.style.removeProperty("--sidebar-ring");
    root.style.removeProperty("--accent");
  }, []);

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans-public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data as Plan[];
    }
  });

  const { data: features } = useQuery({
    queryKey: ['plan-features-public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_features')
        .select('*');
      
      if (error) throw error;
      return data as (PlanFeature & { plan_id: string })[];
    }
  });

  const { data: limits } = useQuery({
    queryKey: ['plan-limits-public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_limits')
        .select('*');
      
      if (error) throw error;
      return data as (PlanLimit & { plan_id: string })[];
    }
  });

  const getPlanFeatures = (planId: string) => {
    return features?.filter(f => f.plan_id === planId) || [];
  };

  const getPlanLimits = (planId: string) => {
    return limits?.filter(l => l.plan_id === planId) || [];
  };

  const getLimit = (planId: string, key: string) => {
    const limit = getPlanLimits(planId).find(l => l.limit_key === key);
    if (!limit) return '-';
    if (limit.is_unlimited) return t('learnMore.unlimited');
    return limit.limit_value?.toString() || '-';
  };

  const hasFeature = (planId: string, key: string) => {
    const feature = getPlanFeatures(planId).find(f => f.feature_key === key);
    return feature?.is_enabled ?? false;
  };

  const formatPrice = (price: number) => {
    const locale = i18n.language === 'pt-BR' ? 'pt-BR' : i18n.language === 'es' ? 'es-ES' : i18n.language === 'zh' ? 'zh-CN' : 'en-US';
    const currency = i18n.language === 'pt-BR' ? 'BRL' : i18n.language === 'es' ? 'EUR' : i18n.language === 'zh' ? 'CNY' : 'USD';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(price);
  };

  const systemFeatures = [
    {
      icon: BarChart3,
      title: t('learnMore.powerBiEmbedded'),
      description: t('learnMore.powerBiEmbeddedDesc')
    },
    {
      icon: Shield,
      title: t('learnMore.advancedSecurity'),
      description: t('learnMore.advancedSecurityDesc')
    },
    {
      icon: Users,
      title: t('learnMore.userManagement'),
      description: t('learnMore.userManagementDesc')
    },
    {
      icon: Monitor,
      title: t('learnMore.sliderTv'),
      description: t('learnMore.sliderTvDesc')
    },
    {
      icon: Database,
      title: t('learnMore.multipleCredentials'),
      description: t('learnMore.multipleCredentialsDesc')
    },
    {
      icon: Zap,
      title: t('learnMore.dataRefresh'),
      description: t('learnMore.dataRefreshDesc')
    }
  ];

  // Get all unique feature keys from database with descriptions
  const allFeatureKeys = features?.reduce((acc, f) => {
    if (!acc.find(item => item.key === f.feature_key)) {
      acc.push({ key: f.feature_key, label: f.feature_description || f.feature_key });
    }
    return acc;
  }, [] as { key: string; label: string }[]) || [];

  // Sort features by a predefined order for consistency
  const featureOrder = [
    'embed_publish',
    'user_group_access', 
    'ai_chat',
    'hide_pages',
    'custom_views',
    'user_refresh',
    'slider_tv',
    'rls_email',
    'advanced_integrations',
    'custom_development',
    'sla_support'
  ];
  
  const sortedFeatureRows = allFeatureKeys.sort((a, b) => {
    const indexA = featureOrder.indexOf(a.key);
    const indexB = featureOrder.indexOf(b.key);
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  const limitRows = [
    { key: 'dashboards', label: t('learnMore.dashboards') },
    { key: 'users', label: t('learnMore.includedUsers') },
    { key: 'credentials', label: t('learnMore.azureCredentials') },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="mr-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={careLogo} alt="Care" className="h-8 w-auto" />
          </div>
          
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <Button 
              variant="default"
              onClick={() => navigate("/auth")}
              className="bg-primary hover:bg-primary/90"
            >
              {t('learnMore.startNow')}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        
        <div className="container relative mx-auto px-6 pt-24 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            <p className="text-primary font-medium mb-4 uppercase tracking-wider text-sm">
              {t('learnMore.discoverCareBi')}
            </p>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight text-foreground">
              {t('learnMore.heroTitle')}{" "}
              <span className="text-primary">{t('learnMore.heroTitleHighlight')}</span>
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t('learnMore.heroDescription')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* System Features */}
      <section className="py-16 bg-card/50">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4 text-foreground">
              {t('learnMore.systemFeatures')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('learnMore.systemFeaturesDesc')}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {systemFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-card p-6 rounded-lg border border-border/50 hover:border-primary/50 transition-all duration-300"
              >
                <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  {feature.title}
                </h3>
                
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4 text-foreground">
              {t('learnMore.plansAndPricing')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('learnMore.choosePlanDesc')}
            </p>
          </motion.div>

          {plansLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t('learnMore.loadingPlans')}</p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="overflow-x-auto"
            >
              <table className="w-full border-collapse">
                {/* Header Row with Plan Names */}
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-6 px-4 w-1/4"></th>
                    {plans?.map((plan) => (
                      <th key={plan.id} className="text-center py-6 px-4">
                        <div className="space-y-3">
                          <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                          {plan.is_custom ? (
                            <p className="text-lg text-muted-foreground">{t('learnMore.custom')}</p>
                          ) : (
                            <>
                              <p className="text-2xl font-bold text-primary">
                                {formatPrice(plan.price_monthly)}
                              </p>
                              <p className="text-sm text-muted-foreground">{t('learnMore.perMonth')}</p>
                            </>
                          )}
                          <Button 
                            onClick={() => navigate("/auth")}
                            className="w-full max-w-[180px] bg-primary hover:bg-primary/90"
                          >
                            {plan.is_custom ? t('learnMore.contactUs') : t('learnMore.startNow')}
                          </Button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {/* Limits Section */}
                  <tr>
                    <td colSpan={(plans?.length || 0) + 1} className="pt-8 pb-4 px-4">
                      <h4 className="text-lg font-semibold text-foreground">{t('learnMore.limits')}</h4>
                    </td>
                  </tr>
                  
                  {limitRows.map((row) => (
                    <tr key={row.key} className="border-b border-border/50">
                      <td className="py-4 px-4 text-muted-foreground">{row.label}</td>
                      {plans?.map((plan) => (
                        <td key={plan.id} className="py-4 px-4 text-center font-medium text-foreground">
                          {getLimit(plan.id, row.key)}
                        </td>
                      ))}
                    </tr>
                  ))}

                  {/* Additional User Price */}
                  <tr className="border-b border-border/50">
                    <td className="py-4 px-4 text-muted-foreground">{t('learnMore.additionalUser')}</td>
                    {plans?.map((plan) => (
                      <td key={plan.id} className="py-4 px-4 text-center font-medium text-foreground">
                        {plan.price_additional_user ? formatPrice(plan.price_additional_user) + '/' + t('learnMore.perMonth').split(' ')[0] : '-'}
                      </td>
                    ))}
                  </tr>

                  {/* Features Section */}
                  <tr>
                    <td colSpan={(plans?.length || 0) + 1} className="pt-8 pb-4 px-4">
                      <h4 className="text-lg font-semibold text-foreground">{t('learnMore.features')}</h4>
                    </td>
                  </tr>
                  
                  {sortedFeatureRows.map((row) => (
                    <tr key={row.key} className="border-b border-border/50">
                      <td className="py-4 px-4 text-muted-foreground">{row.label}</td>
                      {plans?.map((plan) => (
                        <td key={plan.id} className="py-4 px-4 text-center">
                          {hasFeature(plan.id, row.key) ? (
                            <Check className="h-5 w-5 text-primary mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground/50 mx-auto" />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className="text-sm text-muted-foreground text-center mt-6">
                {t('learnMore.trialNote')}
              </p>
            </motion.div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-card/50">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-gradient-to-r from-primary/20 to-primary/5 max-w-4xl mx-auto p-12 rounded-2xl border border-primary/20 text-center"
          >
            <h2 className="text-3xl font-bold mb-4 text-foreground">
              {t('learnMore.readyToTransform')}
            </h2>
            
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t('learnMore.ctaDescription')}
            </p>
            
            <Button 
              size="lg" 
              className="text-base h-12 px-8 bg-primary hover:bg-primary/90"
              onClick={() => navigate("/auth")}
            >
              {t('learnMore.createFreeAccount')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border/50">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={careLogo} alt="Care" className="h-6 w-auto" />
            </div>
            
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Care Business. {t('learnMore.allRightsReserved')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LearnMore;