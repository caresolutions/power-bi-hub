import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "./useUserRole";

export interface SubscriptionPlan {
  id: string;
  plan_key: string;
  name: string;
  price_monthly: number;
  price_additional_user: number | null;
  trial_days: number;
  is_active: boolean;
  is_custom: boolean;
  display_order: number;
  description: string | null;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
}

export interface PlanLimit {
  id: string;
  plan_id: string;
  limit_key: string;
  limit_value: number | null;
  is_unlimited: boolean;
}

export interface PlanFeature {
  id: string;
  plan_id: string;
  feature_key: string;
  is_enabled: boolean;
  feature_description: string | null;
}

export interface CurrentUsage {
  dashboards: number;
  users: number;
  credentials: number;
}

interface UseSubscriptionPlanReturn {
  currentPlan: SubscriptionPlan | null;
  planLimits: PlanLimit[];
  planFeatures: PlanFeature[];
  currentUsage: CurrentUsage;
  loading: boolean;
  isTrialing: boolean;
  trialDaysRemaining: number;
  subscriptionStatus: string;
  checkLimit: (limitKey: string) => { allowed: boolean; current: number; limit: number | null; isUnlimited: boolean };
  hasFeature: (featureKey: string) => boolean;
  refetch: () => Promise<void>;
}

export function useSubscriptionPlan(): UseSubscriptionPlanReturn {
  const { companyId, isAdmin, isMasterAdmin, userId } = useUserRole();
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const [planLimits, setPlanLimits] = useState<PlanLimit[]>([]);
  const [planFeatures, setPlanFeatures] = useState<PlanFeature[]>([]);
  const [currentUsage, setCurrentUsage] = useState<CurrentUsage>({ dashboards: 0, users: 0, credentials: 0 });
  const [loading, setLoading] = useState(true);
  const [isTrialing, setIsTrialing] = useState(false);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(0);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("inactive");

  const fetchSubscriptionData = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);

      // Get user's subscription
      let adminUserId = userId;
      
      // If not admin, get admin user for the company
      if (!isAdmin && companyId) {
        const { data: adminData } = await supabase
          .from("profiles")
          .select("id")
          .eq("company_id", companyId)
          .limit(1)
          .maybeSingle();
        
        if (adminData) {
          // Get admin user role
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("user_id")
            .eq("role", "admin")
            .limit(100);
          
          const adminIds = roleData?.map(r => r.user_id) || [];
          
          // Find company admin
          const { data: companyProfiles } = await supabase
            .from("profiles")
            .select("id")
            .eq("company_id", companyId);
          
          const companyUserIds = companyProfiles?.map(p => p.id) || [];
          const companyAdminId = adminIds.find(id => companyUserIds.includes(id));
          
          if (companyAdminId) {
            adminUserId = companyAdminId;
          }
        }
      }

      // Get subscription
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", adminUserId)
        .maybeSingle();

      if (!subscription) {
        setLoading(false);
        return;
      }

      setSubscriptionStatus(subscription.status);
      
      // Check if trialing
      if (subscription.status === "trial") {
        setIsTrialing(true);
        if (subscription.current_period_end) {
          const endDate = new Date(subscription.current_period_end);
          const now = new Date();
          const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          setTrialDaysRemaining(Math.max(0, daysRemaining));
        }
      } else {
        setIsTrialing(false);
        setTrialDaysRemaining(0);
      }

      // Get plan details
      const { data: plan } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("plan_key", subscription.plan)
        .maybeSingle();

      if (plan) {
        setCurrentPlan(plan as SubscriptionPlan);

        // Get plan limits
        const { data: limits } = await supabase
          .from("plan_limits")
          .select("*")
          .eq("plan_id", plan.id);

        setPlanLimits((limits || []) as PlanLimit[]);

        // Get plan features
        const { data: features } = await supabase
          .from("plan_features")
          .select("*")
          .eq("plan_id", plan.id);

        setPlanFeatures((features || []) as PlanFeature[]);
      }

      // Get current usage for the company
      if (companyId) {
        // Fetch company custom overrides
        const { data: customLimits } = await supabase
          .from("company_custom_limits")
          .select("*")
          .eq("company_id", companyId);

        const { data: customFeatures } = await supabase
          .from("company_custom_features")
          .select("*")
          .eq("company_id", companyId);

        // Apply limit overrides
        if (customLimits && customLimits.length > 0) {
          setPlanLimits((prev) => {
            const overrideMap = new Map(customLimits.map((cl: any) => [cl.limit_key, cl]));
            return prev.map((limit) => {
              const override = overrideMap.get(limit.limit_key);
              if (override) {
                return {
                  ...limit,
                  limit_value: (override as any).limit_value,
                  is_unlimited: (override as any).is_unlimited,
                };
              }
              return limit;
            });
          });
        }

        // Apply feature overrides
        if (customFeatures && customFeatures.length > 0) {
          setPlanFeatures((prev) => {
            const overrideMap = new Map(customFeatures.map((cf: any) => [cf.feature_key, cf]));
            return prev.map((feature) => {
              const override = overrideMap.get(feature.feature_key);
              if (override) {
                return {
                  ...feature,
                  is_enabled: (override as any).is_enabled,
                };
              }
              return feature;
            });
          });
        }

        // Count dashboards
        const { count: dashboardCount } = await supabase
          .from("dashboards")
          .select("*", { count: "exact", head: true })
          .eq("company_id", companyId);

        // Count users (profiles in company)
        const { count: userCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("is_active", true);

        // Count credentials
        const { count: credentialCount } = await supabase
          .from("power_bi_configs")
          .select("*", { count: "exact", head: true })
          .eq("company_id", companyId);

        setCurrentUsage({
          dashboards: dashboardCount || 0,
          users: userCount || 0,
          credentials: credentialCount || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching subscription data:", error);
    } finally {
      setLoading(false);
    }
  }, [userId, companyId, isAdmin]);

  useEffect(() => {
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  const checkLimit = useCallback((limitKey: string) => {
    // Master admins have no limits
    if (isMasterAdmin) {
      return { allowed: true, current: 0, limit: null, isUnlimited: true };
    }

    const limit = planLimits.find(l => l.limit_key === limitKey);
    
    if (!limit) {
      return { allowed: true, current: 0, limit: null, isUnlimited: true };
    }

    if (limit.is_unlimited) {
      return { allowed: true, current: currentUsage[limitKey as keyof CurrentUsage] || 0, limit: null, isUnlimited: true };
    }

    const current = currentUsage[limitKey as keyof CurrentUsage] || 0;
    const allowed = current < (limit.limit_value || 0);

    return {
      allowed,
      current,
      limit: limit.limit_value,
      isUnlimited: false,
    };
  }, [planLimits, currentUsage, isMasterAdmin]);

  const hasFeature = useCallback((featureKey: string) => {
    // Master admins have all features
    if (isMasterAdmin) {
      return true;
    }

    const feature = planFeatures.find(f => f.feature_key === featureKey);
    return feature?.is_enabled || false;
  }, [planFeatures, isMasterAdmin]);

  return {
    currentPlan,
    planLimits,
    planFeatures,
    currentUsage,
    loading,
    isTrialing,
    trialDaysRemaining,
    subscriptionStatus,
    checkLimit,
    hasFeature,
    refetch: fetchSubscriptionData,
  };
}
