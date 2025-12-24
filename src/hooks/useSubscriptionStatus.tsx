import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "./useUserRole";

export interface SubscriptionStatus {
  subscribed: boolean;
  status: string;
  planKey: string | null;
  planName: string | null;
  productId: string | null;
  subscriptionEnd: string | null;
  isTrialing: boolean;
  isMasterManaged: boolean;
  isBlocked: boolean;
  trialDaysRemaining: number;
  gracePeriodDaysRemaining?: number;
}

interface UseSubscriptionStatusReturn {
  subscriptionStatus: SubscriptionStatus | null;
  loading: boolean;
  error: string | null;
  checkSubscription: () => Promise<void>;
  isAccessBlocked: boolean;
  blockReason: string | null;
}

export function useSubscriptionStatus(): UseSubscriptionStatusReturn {
  const { isAdmin, isMasterAdmin, userId } = useUserRole();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkSubscription = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      // Master admins always have access
      if (isMasterAdmin) {
        setSubscriptionStatus({
          subscribed: true,
          status: "active",
          planKey: "enterprise",
          planName: "Master Admin",
          productId: null,
          subscriptionEnd: null,
          isTrialing: false,
          isMasterManaged: true,
          isBlocked: false,
          trialDaysRemaining: 0,
        });
        setLoading(false);
        return;
      }

      // If not admin, we need to check the admin's subscription
      let targetUserId = userId;
      
      if (!isAdmin) {
        // Get user's company
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("id", userId)
          .maybeSingle();

        if (profile?.company_id) {
          // Find admin of the company
          const { data: companyProfiles } = await supabase
            .from("profiles")
            .select("id")
            .eq("company_id", profile.company_id);

          const companyUserIds = companyProfiles?.map(p => p.id) || [];

          const { data: adminRoles } = await supabase
            .from("user_roles")
            .select("user_id")
            .eq("role", "admin")
            .in("user_id", companyUserIds);

          if (adminRoles && adminRoles.length > 0) {
            targetUserId = adminRoles[0].user_id;
          }
        }
      }

      // Now check subscription for target user (admin)
      const { data: session } = await supabase.auth.getSession();
      
      // If checking for a different user, use local DB
      if (targetUserId !== userId) {
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", targetUserId)
          .maybeSingle();

        if (subscription) {
          const isTrialing = subscription.status === "trial";
          let trialDaysRemaining = 0;
          let isBlocked = false;

          if (isTrialing && subscription.current_period_end) {
            const endDate = new Date(subscription.current_period_end);
            const now = new Date();
            trialDaysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            isBlocked = trialDaysRemaining <= 0;
          } else if (subscription.status === "expired" || subscription.status === "canceled") {
            isBlocked = true;
          }

          // Get plan name
          const { data: planData } = await supabase
            .from("subscription_plans")
            .select("name, stripe_product_id")
            .eq("plan_key", subscription.plan)
            .maybeSingle();

          setSubscriptionStatus({
            subscribed: subscription.status === "active" || (isTrialing && !isBlocked),
            status: subscription.status,
            planKey: subscription.plan,
            planName: planData?.name || subscription.plan,
            productId: planData?.stripe_product_id || null,
            subscriptionEnd: subscription.current_period_end,
            isTrialing,
            isMasterManaged: subscription.is_master_managed || false,
            isBlocked,
            trialDaysRemaining: Math.max(0, trialDaysRemaining),
          });
        } else {
          setSubscriptionStatus({
            subscribed: false,
            status: "inactive",
            planKey: null,
            planName: null,
            productId: null,
            subscriptionEnd: null,
            isTrialing: false,
            isMasterManaged: false,
            isBlocked: true,
            trialDaysRemaining: 0,
          });
        }
      } else {
        // Call edge function for current user (admin)
        // Ensure we have a valid session before calling
        if (!session?.session?.access_token) {
          console.log("No active session, skipping subscription check");
          setLoading(false);
          return;
        }
        
        const { data, error: funcError } = await supabase.functions.invoke('check-subscription');
        
        if (funcError) throw funcError;
        setSubscriptionStatus(data);
      }
    } catch (err: any) {
      console.error("Error checking subscription:", err);
      setError(err.message);
      // Default to blocked on error
      setSubscriptionStatus({
        subscribed: false,
        status: "error",
        planKey: null,
        planName: null,
        productId: null,
        subscriptionEnd: null,
        isTrialing: false,
        isMasterManaged: false,
        isBlocked: false, // Don't block on error, just show error
        trialDaysRemaining: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [userId, isAdmin, isMasterAdmin]);

  useEffect(() => {
    checkSubscription();
    
    // Check subscription every minute
    const interval = setInterval(checkSubscription, 60000);
    
    return () => clearInterval(interval);
  }, [checkSubscription]);

  // Determine if access is blocked and why
  const isAccessBlocked = subscriptionStatus?.isBlocked || false;
  
  let blockReason: string | null = null;
  if (isAccessBlocked) {
    if (subscriptionStatus?.status === "trial" || subscriptionStatus?.status === "expired") {
      blockReason = "Seu período de trial expirou. Assine um plano para continuar usando o sistema.";
    } else if (subscriptionStatus?.status === "canceled") {
      blockReason = "Sua assinatura foi cancelada. Assine um plano para continuar usando o sistema.";
    } else {
      blockReason = "Sua assinatura está inativa. Assine um plano para continuar usando o sistema.";
    }
  }

  return {
    subscriptionStatus,
    loading,
    error,
    checkSubscription,
    isAccessBlocked,
    blockReason,
  };
}