import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { ConsentDialog } from "./ConsentDialog";
import { supabase } from "@/integrations/supabase/client";
import { privacyPolicyContent } from "@/content/privacyPolicy";

interface ConsentContextType {
  hasConsent: boolean;
  revokeConsent: () => void;
}

const ConsentContext = createContext<ConsentContextType>({
  hasConsent: false,
  revokeConsent: () => {},
});

export const useConsent = () => useContext(ConsentContext);

// Routes that don't require consent
const PUBLIC_ROUTES = ["/", "/auth", "/privacy-policy"];

interface ConsentProviderProps {
  children: ReactNode;
}

export const ConsentProvider = ({ children }: ConsentProviderProps) => {
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const location = useLocation();

  // Check for authenticated user
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    
    checkUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  // Check consent status from database
  useEffect(() => {
    const checkConsent = async () => {
      if (!userId) {
        // Not logged in, check localStorage as fallback
        const localConsent = localStorage.getItem("privacy_consent");
        if (localConsent) {
          try {
            const parsed = JSON.parse(localConsent);
            setHasConsent(parsed.accepted === true);
            return;
          } catch {
            setHasConsent(false);
            return;
          }
        }
        setHasConsent(false);
        return;
      }

      // Check database for consent record
      const { data, error } = await supabase
        .from("privacy_consent_records")
        .select("id, policy_version")
        .eq("user_id", userId)
        .order("accepted_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error checking consent:", error);
        setHasConsent(false);
        return;
      }

      // Check if user has consented to the current version
      if (data && data.policy_version === privacyPolicyContent.lastUpdate) {
        setHasConsent(true);
      } else {
        setHasConsent(false);
      }
    };

    checkConsent();
  }, [userId]);

  useEffect(() => {
    if (hasConsent === null) return; // Still loading
    
    const isPublicRoute = PUBLIC_ROUTES.some(route => location.pathname === route);
    
    if (!hasConsent && !isPublicRoute) {
      setShowDialog(true);
    } else {
      setShowDialog(false);
    }
  }, [hasConsent, location.pathname]);

  const handleAccept = async () => {
    if (userId) {
      // Save to database
      const { error } = await supabase
        .from("privacy_consent_records")
        .insert({
          user_id: userId,
          policy_version: privacyPolicyContent.lastUpdate,
          user_agent: navigator.userAgent,
        });

      if (error) {
        console.error("Error saving consent:", error);
      }
    }

    // Also save to localStorage as backup
    localStorage.setItem("privacy_consent", JSON.stringify({
      accepted: true,
      timestamp: new Date().toISOString(),
      version: privacyPolicyContent.lastUpdate
    }));

    setHasConsent(true);
    setShowDialog(false);
  };

  const revokeConsent = () => {
    localStorage.removeItem("privacy_consent");
    setHasConsent(false);
  };

  // Still loading consent status
  if (hasConsent === null) {
    return null;
  }

  return (
    <ConsentContext.Provider value={{ hasConsent: !!hasConsent, revokeConsent }}>
      {children}
      <ConsentDialog open={showDialog} onAccept={handleAccept} />
    </ConsentContext.Provider>
  );
};
