import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

export type AppRole = "master_admin" | "admin" | "user";

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

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  userId: string | null;
  role: AppRole | null;
  isMasterAdmin: boolean;
  isAdmin: boolean;
  isUser: boolean;
  companyId: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  loading: boolean;
  subscriptionLoading: boolean;
  isAccessBlocked: boolean;
  blockReason: string | null;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Cache for user data to avoid redundant queries
let cachedUserData: {
  userId: string;
  role: AppRole;
  companyId: string | null;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  const fetchUserData = useCallback(async (currentUser: User) => {
    // Check cache first
    if (
      cachedUserData &&
      cachedUserData.userId === currentUser.id &&
      Date.now() - cachedUserData.timestamp < CACHE_DURATION
    ) {
      setRole(cachedUserData.role);
      setCompanyId(cachedUserData.companyId);
      return cachedUserData;
    }

    try {
      // Fetch roles and profile in parallel
      const [rolesResult, profileResult] = await Promise.all([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", currentUser.id),
        supabase
          .from("profiles")
          .select("company_id")
          .eq("id", currentUser.id)
          .maybeSingle()
      ]);

      const roles = rolesResult.data?.map((r) => r.role) || [];
      
      let highestRole: AppRole = "user";
      if (roles.includes("master_admin")) {
        highestRole = "master_admin";
      } else if (roles.includes("admin")) {
        highestRole = "admin";
      }

      const userCompanyId = highestRole !== "master_admin" ? profileResult.data?.company_id || null : null;

      // Update cache
      cachedUserData = {
        userId: currentUser.id,
        role: highestRole,
        companyId: userCompanyId,
        timestamp: Date.now()
      };

      setRole(highestRole);
      setCompanyId(userCompanyId);
      
      return cachedUserData;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  }, []);

  const checkSubscription = useCallback(async (userData: { userId: string; role: AppRole; companyId: string | null } | null) => {
    if (!userData) {
      setSubscriptionLoading(false);
      return;
    }

    try {
      setSubscriptionLoading(true);

      // Master admins always have access
      if (userData.role === "master_admin") {
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
        return;
      }

      // For non-admin users, find the admin's subscription
      let targetUserId = userData.userId;
      
      if (userData.role === "user" && userData.companyId) {
        // Find admin of the company - single optimized query
        const { data: adminData } = await supabase
          .from("profiles")
          .select(`
            id,
            user_roles!inner(role)
          `)
          .eq("company_id", userData.companyId)
          .eq("user_roles.role", "admin")
          .limit(1)
          .maybeSingle();

        if (adminData) {
          targetUserId = adminData.id;
        }
      }

      // Check subscription
      if (targetUserId !== userData.userId) {
        // Use local DB for non-admin users
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

          // Get plan name in parallel only if needed
          let planName = subscription.plan;
          let productId = null;
          
          const { data: planData } = await supabase
            .from("subscription_plans")
            .select("name, stripe_product_id")
            .eq("plan_key", subscription.plan)
            .maybeSingle();
          
          if (planData) {
            planName = planData.name;
            productId = planData.stripe_product_id;
          }

          setSubscriptionStatus({
            subscribed: subscription.status === "active" || (isTrialing && !isBlocked),
            status: subscription.status,
            planKey: subscription.plan,
            planName,
            productId,
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
        const { data, error } = await supabase.functions.invoke('check-subscription');
        
        if (error) throw error;
        setSubscriptionStatus(data);
      }
    } catch (err) {
      console.error("Error checking subscription:", err);
      setSubscriptionStatus({
        subscribed: false,
        status: "error",
        planKey: null,
        planName: null,
        productId: null,
        subscriptionEnd: null,
        isTrialing: false,
        isMasterManaged: false,
        isBlocked: false,
        trialDaysRemaining: 0,
      });
    } finally {
      setSubscriptionLoading(false);
    }
  }, []);

  const refreshSubscription = useCallback(async () => {
    if (cachedUserData) {
      await checkSubscription(cachedUserData);
    }
  }, [checkSubscription]);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          const userData = await fetchUserData(currentSession.user);
          if (mounted) {
            setLoading(false);
            await checkSubscription(userData);
          }
        } else {
          setLoading(false);
          setSubscriptionLoading(false);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        if (mounted) {
          setLoading(false);
          setSubscriptionLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (event === 'SIGNED_OUT') {
        cachedUserData = null;
        setRole(null);
        setCompanyId(null);
        setSubscriptionStatus(null);
        setLoading(false);
        setSubscriptionLoading(false);
      } else if (newSession?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        // Use setTimeout to prevent deadlock - never await inside onAuthStateChange
        setTimeout(async () => {
          if (!mounted) return;
          const userData = await fetchUserData(newSession.user);
          if (mounted) {
            setLoading(false);
            await checkSubscription(userData);
          }
        }, 0);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserData, checkSubscription]);

  // Determine block reason
  let blockReason: string | null = null;
  const isAccessBlocked = subscriptionStatus?.isBlocked || false;
  
  if (isAccessBlocked) {
    if (subscriptionStatus?.status === "trial" || subscriptionStatus?.status === "expired") {
      blockReason = "Seu período de trial expirou. Assine um plano para continuar usando o sistema.";
    } else if (subscriptionStatus?.status === "canceled") {
      blockReason = "Sua assinatura foi cancelada. Assine um plano para continuar usando o sistema.";
    } else {
      blockReason = "Sua assinatura está inativa. Assine um plano para continuar usando o sistema.";
    }
  }

  const value: AuthContextValue = {
    user,
    session,
    userId: user?.id ?? null,
    role,
    isMasterAdmin: role === "master_admin",
    isAdmin: role === "admin" || role === "master_admin",
    isUser: role === "user",
    companyId,
    subscriptionStatus,
    loading,
    subscriptionLoading,
    isAccessBlocked,
    blockReason,
    refreshSubscription,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
