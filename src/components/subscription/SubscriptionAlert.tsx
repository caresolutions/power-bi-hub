import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useUserRole } from "@/hooks/useUserRole";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, CreditCard, UserCog } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function SubscriptionAlert() {
  const { subscriptionStatus, loading } = useSubscriptionStatus();
  const { isUser, isAdmin, isMasterAdmin } = useUserRole();
  const navigate = useNavigate();

  if (loading || !subscriptionStatus) return null;

  // Don't show alert if subscription is active and not in trial
  if (subscriptionStatus.subscribed && !subscriptionStatus.isTrialing) return null;

  // Don't show for master managed subscriptions
  if (subscriptionStatus.isMasterManaged) return null;

  // Check if user is a viewer (not admin)
  const isViewer = isUser && !isAdmin && !isMasterAdmin;

  // Trial warning
  if (subscriptionStatus.isTrialing && subscriptionStatus.trialDaysRemaining > 0) {
    return (
      <Alert className="border-amber-500/50 bg-amber-500/10 mb-6">
        <Clock className="h-4 w-4 text-amber-500" />
        <AlertDescription className="flex items-center justify-between flex-wrap gap-4">
          <span className="text-amber-500">
            <strong>Período de trial:</strong> {subscriptionStatus.trialDaysRemaining} {subscriptionStatus.trialDaysRemaining === 1 ? 'dia restante' : 'dias restantes'}
          </span>
          {isViewer ? (
            <span className="text-sm text-amber-600 flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              Solicite ao administrador para assinar um plano
            </span>
          ) : (
            <Button 
              size="sm" 
              className="bg-amber-500 hover:bg-amber-600"
              onClick={() => navigate("/subscription")}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Assinar agora
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Grace period warning (for canceled subscriptions)
  if (subscriptionStatus.status === "canceled" && subscriptionStatus.gracePeriodDaysRemaining && subscriptionStatus.gracePeriodDaysRemaining > 0) {
    return (
      <Alert className="border-destructive/50 bg-destructive/10 mb-6">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <AlertDescription className="flex items-center justify-between flex-wrap gap-4">
          <span className="text-destructive">
            <strong>Assinatura cancelada:</strong> Você tem {subscriptionStatus.gracePeriodDaysRemaining} dias para reativar antes do bloqueio.
          </span>
          {isViewer ? (
            <span className="text-sm text-destructive flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              Solicite ao administrador para reativar a assinatura
            </span>
          ) : (
            <Button 
              size="sm" 
              variant="destructive"
              onClick={() => navigate("/subscription")}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Reativar assinatura
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Subscription inactive warning
  if (!subscriptionStatus.subscribed && subscriptionStatus.status !== "expired") {
    return (
      <Alert className="border-amber-500/50 bg-amber-500/10 mb-6">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertDescription className="flex items-center justify-between flex-wrap gap-4">
          <span>
            <strong>Sem assinatura ativa.</strong> {isViewer ? "Contate seu administrador para assinar um plano." : "Assine um plano para desbloquear todos os recursos."}
          </span>
          {!isViewer && (
            <Button 
              size="sm"
              onClick={() => navigate("/subscription")}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Ver planos
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}