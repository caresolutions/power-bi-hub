import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CreditCard, FileX, ExternalLink, AlertTriangle, Calendar, Crown } from "lucide-react";

interface SubscriptionStatus {
  subscribed: boolean;
  productId: string | null;
  subscriptionEnd: string | null;
  isTrialing: boolean;
}

const STRIPE_PLANS: Record<string, { name: string }> = {
  prod_TXiAfvNuN13Bdj: { name: "Free" },
  prod_TXiBsq6Urco479: { name: "Profissional" },
  prod_TXiB1hRL7kIi0Z: { name: "Enterprise" },
};

export const CancellationSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;
      setSubscriptionStatus(data);
    } catch (error: any) {
      console.error("Error checking subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) {
        // Check if it's a managed subscription error from response body
        const errorBody = typeof error === 'object' && 'context' in error ? (error as any).context : null;
        if (errorBody?.body) {
          try {
            const parsed = JSON.parse(errorBody.body);
            if (parsed.error === 'no_stripe_customer') {
              toast.info(parsed.message || "Sua assinatura é gerenciada pelo administrador.");
              return;
            }
          } catch {}
        }
        throw error;
      }
      
      if (data?.error === 'no_stripe_customer') {
        toast.info(data.message || "Sua assinatura é gerenciada pelo administrador.");
        return;
      }
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error("Error opening customer portal:", error);
      toast.error("Erro ao abrir portal do cliente.");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setPortalLoading(true);
    setShowCancelDialog(false);
    
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) {
        // Check if it's a managed subscription error from response body
        const errorBody = typeof error === 'object' && 'context' in error ? (error as any).context : null;
        if (errorBody?.body) {
          try {
            const parsed = JSON.parse(errorBody.body);
            if (parsed.error === 'no_stripe_customer') {
              toast.info(parsed.message || "Sua assinatura é gerenciada pelo administrador.");
              return;
            }
          } catch {}
        }
        throw error;
      }
      
      if (data?.error === 'no_stripe_customer') {
        toast.info(data.message || "Sua assinatura é gerenciada pelo administrador.");
        return;
      }
      
      if (data?.url) {
        window.open(data.url, '_blank');
        toast.info("Você será redirecionado para o portal de gerenciamento. Selecione 'Cancelar plano' para prosseguir.");
      }
    } catch (error: any) {
      console.error("Error opening customer portal:", error);
      toast.error("Erro ao abrir portal do cliente.");
    } finally {
      setPortalLoading(false);
    }
  };

  const getPlanName = () => {
    if (!subscriptionStatus?.productId) return "Sem plano";
    return STRIPE_PLANS[subscriptionStatus.productId]?.name || "Plano desconhecido";
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Status da Assinatura
          </CardTitle>
          <CardDescription>
            Informações sobre sua assinatura atual
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Crown className="h-8 w-8 text-primary" />
              <div>
                <p className="font-semibold">{getPlanName()}</p>
                <p className="text-sm text-muted-foreground">
                  {subscriptionStatus?.subscribed ? "Assinatura ativa" : "Sem assinatura ativa"}
                </p>
              </div>
            </div>
            <Badge variant={subscriptionStatus?.subscribed ? "default" : "secondary"}>
              {subscriptionStatus?.isTrialing ? "Trial" : subscriptionStatus?.subscribed ? "Ativo" : "Inativo"}
            </Badge>
          </div>

          {subscriptionStatus?.subscriptionEnd && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {subscriptionStatus?.isTrialing ? "Trial expira em: " : "Próxima cobrança: "}
                {formatDate(subscriptionStatus.subscriptionEnd)}
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate('/subscription')} variant="outline">
              <CreditCard className="mr-2 h-4 w-4" />
              Ver Planos
            </Button>
            {subscriptionStatus?.subscribed && (
              <Button onClick={handleManageSubscription} variant="outline" disabled={portalLoading}>
                {portalLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="mr-2 h-4 w-4" />
                )}
                Gerenciar Assinatura
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cancellation Section */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <FileX className="h-5 w-5" />
            Cancelamento de Assinatura
          </CardTitle>
          <CardDescription>
            Opções para cancelar sua assinatura
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-500 mb-1">Antes de cancelar</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Você manterá acesso até o final do período pago</li>
                  <li>• Dentro de 7 dias da contratação, você tem direito a reembolso integral (Art. 49 CDC)</li>
                  <li>• Seus dados serão mantidos por 30 dias após o cancelamento</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button 
              variant="outline"
              onClick={() => navigate('/cancellation-policy')}
            >
              <FileX className="mr-2 h-4 w-4" />
              Ver Política de Cancelamento
            </Button>

            {subscriptionStatus?.subscribed && (
              <Button 
                variant="destructive"
                onClick={() => setShowCancelDialog(true)}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileX className="mr-2 h-4 w-4" />
                )}
                Cancelar Assinatura
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar Cancelamento
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Tem certeza que deseja cancelar sua assinatura?</p>
              <div className="bg-muted p-3 rounded-lg text-sm">
                <p className="font-medium mb-2">O que acontece após o cancelamento:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Acesso mantido até {formatDate(subscriptionStatus?.subscriptionEnd || null)}</li>
                  <li>• Sem cobranças futuras</li>
                  <li>• Dados mantidos por 30 dias</li>
                </ul>
              </div>
              <p className="text-sm">
                Você será redirecionado para o portal de gerenciamento para confirmar o cancelamento.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelSubscription}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Continuar com Cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
