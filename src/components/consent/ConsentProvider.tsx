import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { ConsentDialog } from "./ConsentDialog";

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
  const location = useLocation();

  useEffect(() => {
    const consentData = localStorage.getItem("privacy_consent");
    if (consentData) {
      try {
        const parsed = JSON.parse(consentData);
        setHasConsent(parsed.accepted === true);
      } catch {
        setHasConsent(false);
      }
    } else {
      setHasConsent(false);
    }
  }, []);

  useEffect(() => {
    if (hasConsent === null) return; // Still loading
    
    const isPublicRoute = PUBLIC_ROUTES.some(route => location.pathname === route);
    
    if (!hasConsent && !isPublicRoute) {
      setShowDialog(true);
    } else {
      setShowDialog(false);
    }
  }, [hasConsent, location.pathname]);

  const handleAccept = () => {
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
