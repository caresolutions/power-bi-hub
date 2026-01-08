import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ArrowRight, 
  Key, 
  ShieldCheck, 
  ExternalLink,
  Info,
  CheckCircle2,
  XCircle,
  Loader2
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface CredentialsStepProps {
  onSubmit: (data: {
    name: string;
    clientId: string;
    clientSecret: string;
    tenantId: string;
    username: string;
    password: string;
  }) => Promise<void>;
  loading?: boolean;
}

const CredentialsStep = ({ onSubmit, loading }: CredentialsStepProps) => {
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Validation states
  const isValidGuid = (value: string) => 
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  
  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const validations = {
    name: name.length >= 3,
    clientId: isValidGuid(clientId),
    clientSecret: clientSecret.length >= 10,
    tenantId: isValidGuid(tenantId),
    username: isValidEmail(username),
    password: password.length >= 6,
  };

  const isFormValid = Object.values(validations).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    await onSubmit({ name, clientId, clientSecret, tenantId, username, password });
  };

  const ValidationIcon = ({ valid }: { valid: boolean }) => {
    if (valid) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    return null;
  };

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Key className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Credenciais Power BI</h2>
        </div>
        <p className="text-muted-foreground">
          Configure suas credenciais do Azure AD para conectar ao Power BI
        </p>
      </motion.div>

      <Alert className="mb-6 border-primary/30 bg-primary/5">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <AlertDescription>
          Suas credenciais são criptografadas com AES-256 e nunca são expostas no frontend.
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit} className="space-y-5">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-2"
        >
          <Label htmlFor="name" className="flex items-center justify-between">
            <span>Nome da Credencial</span>
            <ValidationIcon valid={validations.name} />
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Produção, Homologação..."
            className="bg-background/50"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <Label htmlFor="clientId" className="flex items-center justify-between">
            <span>Client ID (Application ID)</span>
            <ValidationIcon valid={validations.clientId} />
          </Label>
          <Input
            id="clientId"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
            className={`bg-background/50 font-mono text-sm ${
              clientId && !validations.clientId ? 'border-destructive' : ''
            }`}
          />
          {clientId && !validations.clientId && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <XCircle className="h-3 w-3" /> Formato inválido (deve ser um GUID)
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-2"
        >
          <Label htmlFor="clientSecret" className="flex items-center justify-between">
            <span>Client Secret</span>
            <ValidationIcon valid={validations.clientSecret} />
          </Label>
          <Input
            id="clientSecret"
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder="••••••••••••••••••••"
            className="bg-background/50 font-mono"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-2"
        >
          <Label htmlFor="tenantId" className="flex items-center justify-between">
            <span>Tenant ID (Directory ID)</span>
            <ValidationIcon valid={validations.tenantId} />
          </Label>
          <Input
            id="tenantId"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
            className={`bg-background/50 font-mono text-sm ${
              tenantId && !validations.tenantId ? 'border-destructive' : ''
            }`}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-2"
        >
          <Label htmlFor="username" className="flex items-center justify-between">
            <span>Usuário Power BI (e-mail)</span>
            <ValidationIcon valid={validations.username} />
          </Label>
          <Input
            id="username"
            type="email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="usuario@empresa.com"
            className={`bg-background/50 ${
              username && !validations.username ? 'border-destructive' : ''
            }`}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-2"
        >
          <Label htmlFor="password" className="flex items-center justify-between">
            <span>Senha Power BI</span>
            <ValidationIcon valid={validations.password} />
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="bg-background/50"
          />
        </motion.div>

        <Accordion type="single" collapsible className="mt-4">
          <AccordionItem value="help" className="border-none">
            <AccordionTrigger className="text-sm text-muted-foreground hover:text-foreground py-2">
              <span className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Como obter essas credenciais?
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-3 pt-2">
              <div className="space-y-2">
                <p><strong>1. Acesse o Portal Azure:</strong></p>
                <a 
                  href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Abrir Portal Azure <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div>
                <p><strong>2. Registre um novo aplicativo</strong> ou use um existente</p>
              </div>
              <div>
                <p><strong>3. Copie:</strong></p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>Application (client) ID</li>
                  <li>Directory (tenant) ID</li>
                  <li>Crie um Client Secret em "Certificates & secrets"</li>
                </ul>
              </div>
              <div>
                <p><strong>4. Configure as permissões</strong> da API do Power BI</p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 shadow-glow"
            disabled={!isFormValid || loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                Continuar
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </motion.div>
      </form>
    </div>
  );
};

export default CredentialsStep;
