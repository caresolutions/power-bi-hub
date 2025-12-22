import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CreditCard, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface SubscriptionGuardProps {
  children: ReactNode;
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { subscriptionStatus, loading, isAccessBlocked, blockReason } = useSubscriptionStatus();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground mt-4">Verificando assinatura...</p>
        </div>
      </div>
    );
  }

  if (isAccessBlocked) {
    return (
      <div className="min-h-screen bg-background">
        <div className="absolute inset-0 bg-gradient-hero opacity-30" />
        
        <main className="relative z-10 container mx-auto px-6 py-12 flex items-center justify-center min-h-screen">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full"
          >
            <Card className="glass p-8 border-destructive/50 text-center">
              <div className="bg-destructive/10 p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              
              <h1 className="text-2xl font-bold mb-4">Acesso Bloqueado</h1>
              
              <p className="text-muted-foreground mb-6">
                {blockReason}
              </p>

              {subscriptionStatus?.isTrialing && subscriptionStatus.trialDaysRemaining === 0 && (
                <p className="text-sm text-amber-500 mb-6">
                  Seu trial de 7 dias expirou.
                </p>
              )}

              {subscriptionStatus?.status === "canceled" && subscriptionStatus.gracePeriodDaysRemaining !== undefined && (
                <p className="text-sm text-amber-500 mb-6">
                  {subscriptionStatus.gracePeriodDaysRemaining > 0 
                    ? `Você tem ${subscriptionStatus.gracePeriodDaysRemaining} dias restantes do período de carência.`
                    : "Seu período de carência de 30 dias expirou."
                  }
                </p>
              )}
              
              <div className="space-y-3">
                <Button 
                  className="w-full"
                  onClick={() => window.location.href = "/subscription"}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Ver Planos de Assinatura
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.location.href = "/auth"}
                >
                  Sair
                </Button>
              </div>
            </Card>
          </motion.div>
        </main>
      </div>
    );
  }

  return <>{children}</>;
}