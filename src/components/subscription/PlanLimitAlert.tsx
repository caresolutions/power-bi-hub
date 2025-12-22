import { AlertCircle, ArrowUpRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface PlanLimitAlertProps {
  limitType: "dashboards" | "users" | "credentials";
  current: number;
  limit: number;
  planName?: string;
}

const LIMIT_LABELS = {
  dashboards: "dashboards",
  users: "usuários",
  credentials: "credenciais",
};

export function PlanLimitAlert({ limitType, current, limit, planName = "atual" }: PlanLimitAlertProps) {
  const navigate = useNavigate();

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Limite do plano atingido</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>
          Você atingiu o limite de {limit} {LIMIT_LABELS[limitType]} do plano {planName}. 
          ({current}/{limit} utilizados)
        </span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate("/subscription")}
          className="ml-4"
        >
          Fazer upgrade
          <ArrowUpRight className="ml-1 h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}
