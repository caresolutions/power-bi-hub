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
  const [authResolved, setAuthResolved] = useState(false);
  const location = useLocation();

  // Check for authenticated user
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
      setAuthResolved(true);
    };
    
    checkUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null);
      setAuthResolved(true);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  // Check consent status from database
  useEffect(() => {
    // Wait until we know auth state to prevent the dialog from flashing on load.
    if (!authResolved) return;

    const readLocal = (): boolean | null => {
      const localConsent = localStorage.getItem("privacy_consent");
      if (!localConsent) return null;
      try {
        const parsed = JSON.parse(localConsent);
        if (parsed.accepted === true && parsed.version === privacyPolicyContent.lastUpdate) {
          return true;
        }
        return parsed.accepted === true ? true : false;
      } catch {
        return null;
      }
    };

    const checkConsent = async () => {
      if (!userId) {
        const local = readLocal();
        setHasConsent(local === true);
        return;
      }

      // Optimistically trust localStorage to avoid flicker while DB check runs
      const local = readLocal();
      if (local === true) {
        setHasConsent(true);
      }

      const { data, error } = await supabase
        .from("privacy_consent_records")
        .select("id, policy_version")
        .eq("user_id", userId)
        .order("accepted_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error checking consent:", error);
        // Keep optimistic value if we had one; otherwise mark as no consent
        if (local !== true) setHasConsent(false);
        return;
      }

      if (data && data.policy_version === privacyPolicyContent.lastUpdate) {
        setHasConsent(true);
      } else if (local === true) {
        // localStorage says accepted but no DB record yet — persist it now
        setHasConsent(true);
        supabase
          .from("privacy_consent_records")
          .insert({
            user_id: userId,
            policy_version: privacyPolicyContent.lastUpdate,
            user_agent: navigator.userAgent,
          })
          .then(({ error: insertErr }) => {
            if (insertErr) console.error("Error backfilling consent:", insertErr);
          });
      } else {
        setHasConsent(false);
      }
    };

    checkConsent();
  }, [userId, authResolved]);

  useEffect(() => {
    if (hasConsent === null) return; // Still loading
    if (!authResolved) return;

    const isPublicRoute = PUBLIC_ROUTES.some(route => location.pathname === route);

    // Only require consent for authenticated users on protected routes.
    // Logged-out users (e.g. right after sign-out) should never see the dialog.
    if (userId && !hasConsent && !isPublicRoute) {
      setShowDialog(true);
    } else {
      setShowDialog(false);
    }
  }, [hasConsent, location.pathname, userId, authResolved]);

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
