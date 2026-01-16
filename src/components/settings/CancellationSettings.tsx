import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  const { t, i18n } = useTranslation();
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

      if (error) throw error;
      
      if (data?.error === 'no_stripe_customer') {
        toast.info(data.message || t('cancellation.managedByAdmin'));
        return;
      }
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error("Error opening customer portal:", error);
      toast.error(t('cancellation.portalError'));
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setPortalLoading(true);
    setShowCancelDialog(false);
    
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;
      
      if (data?.error === 'no_stripe_customer') {
        toast.info(data.message || t('cancellation.managedByAdmin'));
        return;
      }
      
      if (data?.url) {
        window.open(data.url, '_blank');
        toast.info(t('cancellation.portalRedirect'));
      }
    } catch (error: any) {
      console.error("Error opening customer portal:", error);
      toast.error(t('cancellation.portalError'));
    } finally {
      setPortalLoading(false);
    }
  };

  const getPlanName = () => {
    if (!subscriptionStatus?.productId) return t('cancellation.noPlan');
    return STRIPE_PLANS[subscriptionStatus.productId]?.name || t('cancellation.unknownPlan');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const locale = i18n.language === 'pt-BR' ? 'pt-BR' : i18n.language === 'es' ? 'es-ES' : i18n.language === 'zh' ? 'zh-CN' : 'en-US';
    return new Date(dateString).toLocaleDateString(locale, {
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
            {t('cancellation.subscriptionStatus')}
          </CardTitle>
          <CardDescription>
            {t('cancellation.subscriptionInfo')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Crown className="h-8 w-8 text-primary" />
              <div>
                <p className="font-semibold">{getPlanName()}</p>
                <p className="text-sm text-muted-foreground">
                  {subscriptionStatus?.subscribed ? t('cancellation.activeSubscription') : t('cancellation.noActiveSubscription')}
                </p>
              </div>
            </div>
            <Badge variant={subscriptionStatus?.subscribed ? "default" : "secondary"}>
              {subscriptionStatus?.isTrialing ? t('cancellation.trial') : subscriptionStatus?.subscribed ? t('cancellation.active') : t('cancellation.inactive')}
            </Badge>
          </div>

          {subscriptionStatus?.subscriptionEnd && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {subscriptionStatus?.isTrialing ? t('cancellation.trialExpires') : t('cancellation.nextBilling')}
                {formatDate(subscriptionStatus.subscriptionEnd)}
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate('/subscription')} variant="outline">
              <CreditCard className="mr-2 h-4 w-4" />
              {t('cancellation.viewPlans')}
            </Button>
            {subscriptionStatus?.subscribed && (
              <Button onClick={handleManageSubscription} variant="outline" disabled={portalLoading}>
                {portalLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="mr-2 h-4 w-4" />
                )}
                {t('cancellation.manageSubscription')}
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
            {t('cancellation.subscriptionCancellation')}
          </CardTitle>
          <CardDescription>
            {t('cancellation.cancellationOptions')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-500 mb-1">{t('cancellation.beforeCanceling')}</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>• {t('cancellation.keepAccessUntilEnd')}</li>
                  <li>• {t('cancellation.refundPolicy')}</li>
                  <li>• {t('cancellation.dataRetention')}</li>
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
              {t('cancellation.viewCancellationPolicy')}
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
                {t('cancellation.cancelSubscription')}
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
              {t('cancellation.confirmCancellation')}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>{t('cancellation.cancelConfirmQuestion')}</p>
              <div className="bg-muted p-3 rounded-lg text-sm">
                <p className="font-medium mb-2">{t('cancellation.afterCancellation')}</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• {t('cancellation.accessMaintained', { date: formatDate(subscriptionStatus?.subscriptionEnd || null) })}</li>
                  <li>• {t('cancellation.noFutureCharges')}</li>
                  <li>• {t('cancellation.dataKept30Days')}</li>
                </ul>
              </div>
              <p className="text-sm">
                {t('cancellation.redirectToPortal')}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancellation.back')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelSubscription}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('cancellation.continueCancellation')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};