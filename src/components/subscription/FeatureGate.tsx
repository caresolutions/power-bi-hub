import { ReactNode } from "react";
import { Lock, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useSubscriptionPlan } from "@/hooks/useSubscriptionPlan";

interface FeatureGateProps {
  featureKey: string;
  featureName: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureGate({ featureKey, featureName, children, fallback }: FeatureGateProps) {
  const { hasFeature, currentPlan, loading } = useSubscriptionPlan();
  const navigate = useNavigate();

  if (loading) {
    return null;
  }

  if (hasFeature(featureKey)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <Card className="border-dashed border-2 border-muted-foreground/25">
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <div className="rounded-full bg-muted p-3 mb-4">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-2">{featureName}</h3>
        <p className="text-muted-foreground mb-4">
          Esta funcionalidade não está disponível no plano {currentPlan?.name || "atual"}.
        </p>
        <Button onClick={() => navigate("/subscription")}>
          Fazer upgrade
          <ArrowUpRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
