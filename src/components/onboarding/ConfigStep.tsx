import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";

interface ConfigStepProps {
  onSubmit: (data: {
    clientId: string;
    clientSecret: string;
    tenantId: string;
  }) => void;
}

const ConfigStep = ({ onSubmit }: ConfigStepProps) => {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [tenantId, setTenantId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ clientId, clientSecret, tenantId });
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">
          Passo 1: Configuração Azure AD
        </h2>
        <p className="text-muted-foreground">
          Insira as credenciais do seu aplicativo Azure AD para conectar ao Power BI
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="clientId">Client ID</Label>
          <Input
            id="clientId"
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
            placeholder="00000000-0000-0000-0000-000000000000"
            className="bg-background/50 font-mono"
          />
          <p className="text-sm text-muted-foreground">
            O ID do aplicativo registrado no Azure AD
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="clientSecret">Client Secret</Label>
          <Input
            id="clientSecret"
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            required
            placeholder="••••••••••••••••••••"
            className="bg-background/50 font-mono"
          />
          <p className="text-sm text-muted-foreground">
            O segredo do cliente gerado no Azure AD
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tenantId">Tenant ID</Label>
          <Input
            id="tenantId"
            type="text"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            required
            placeholder="00000000-0000-0000-0000-000000000000"
            className="bg-background/50 font-mono"
          />
          <p className="text-sm text-muted-foreground">
            O ID do seu tenant do Azure AD
          </p>
        </div>

        <Button
          type="submit"
          className="w-full bg-primary hover:bg-primary/90 shadow-glow"
        >
          Continuar
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </form>
    </div>
  );
};

export default ConfigStep;
