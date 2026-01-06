import { useAuth, SubscriptionStatus } from "@/contexts/AuthContext";

interface UseSubscriptionStatusReturn {
  subscriptionStatus: SubscriptionStatus | null;
  loading: boolean;
  error: string | null;
  checkSubscription: () => Promise<void>;
  isAccessBlocked: boolean;
  blockReason: string | null;
}

export function useSubscriptionStatus(): UseSubscriptionStatusReturn {
  const { 
    subscriptionStatus, 
    subscriptionLoading, 
    isAccessBlocked, 
    blockReason,
    refreshSubscription 
  } = useAuth();

  return {
    subscriptionStatus,
    loading: subscriptionLoading,
    error: null,
    checkSubscription: refreshSubscription,
    isAccessBlocked,
    blockReason,
  };
}

export type { SubscriptionStatus };
