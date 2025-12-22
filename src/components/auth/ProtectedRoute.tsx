import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import { useUserRole } from "@/hooks/useUserRole";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireMasterAdmin?: boolean;
  requireSubscription?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requireAdmin = false, 
  requireMasterAdmin = false,
  requireSubscription = true 
}: ProtectedRouteProps) {
  const navigate = useNavigate();
  const { isAdmin, isMasterAdmin, loading: roleLoading, userId } = useUserRole();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setAuthChecked(true);
    };
    checkAuth();
  }, [navigate]);

  // Wait for auth check
  if (!authChecked || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  // Check role requirements
  if (requireMasterAdmin && !isMasterAdmin) {
    navigate("/home");
    return null;
  }

  if (requireAdmin && !isAdmin && !isMasterAdmin) {
    navigate("/home");
    return null;
  }

  // Master admins skip subscription check
  if (isMasterAdmin || !requireSubscription) {
    return <>{children}</>;
  }

  // Wrap with subscription guard for subscription-protected routes
  return <SubscriptionGuard>{children}</SubscriptionGuard>;
}