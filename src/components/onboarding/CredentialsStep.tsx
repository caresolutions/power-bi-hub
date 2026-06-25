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
import { useTranslation } from "react-i18next";
import entraAppOverview from "@/assets/entra-app-overview.png";
import entraClientSecret from "@/assets/entra-client-secret.png";

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
  const { t } = useTranslation();
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
          <h2 className="text-2xl font-bold">{t("onboarding.credentialsTitle")}</h2>
        </div>
        <p className="text-muted-foreground">
          {t("onboarding.credentialsSubtitle")}
        </p>
      </motion.div>

      <Alert className="mb-6 border-primary/30 bg-primary/5">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <AlertDescription>
          {t("onboarding.credentialsEncrypted")}
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
            <span>{t("onboarding.credentialName")}</span>
            <ValidationIcon valid={validations.name} />
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("onboarding.credentialNamePlaceholder")}
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
            <span>{t("onboarding.clientId")}</span>
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
              <XCircle className="h-3 w-3" /> {t("onboarding.invalidGuid")}
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
            <span>{t("onboarding.clientSecret")}</span>
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
            <span>{t("onboarding.tenantId")}</span>
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
            <span>{t("onboarding.powerBiUser")}</span>
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
            <span>{t("onboarding.powerBiPassword")}</span>
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
                {t("onboarding.howToGetCredentials")}
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-4 pt-2">
              <div className="space-y-2">
                <p><strong>1. {t("onboarding.accessAzurePortal")}</strong></p>
                <p className="text-xs">
                  Acesse o <strong>Centro de administração do Microsoft Entra</strong> → <strong>Entra ID</strong> → <strong>Registros de aplicativo</strong>.
                </p>
                <a
                  href="https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {t("onboarding.openAzurePortal")} <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="space-y-2">
                <p><strong>2. {t("onboarding.registerApp")}</strong></p>
                <p className="text-xs">
                  Crie (ou abra) seu aplicativo. Na tela <strong>Visão geral</strong> você encontra o <strong>Client ID</strong> (ID do aplicativo) e o <strong>Tenant ID</strong> (ID do diretório):
                </p>
                <div className="block rounded-lg border border-border/50 overflow-hidden">
                  <img
                    src={entraAppOverview}
                    alt="Tela de visão geral do aplicativo no Microsoft Entra mostrando Client ID e Tenant ID"
                    className="w-full h-auto"
                    loading="lazy"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p><strong>3. {t("onboarding.createClientSecret")}</strong></p>
                <p className="text-xs">
                  No menu lateral do app, abra <strong>Certificados e segredos</strong> → aba <strong>Segredos do cliente</strong> → <strong>Novo segredo do cliente</strong>. Defina uma descrição e validade e clique em <strong>Adicionar</strong>.
                </p>
                <div className="block rounded-lg border border-border/50 overflow-hidden">
                  <img
                    src={entraClientSecret}
                    alt="Tela de Certificados e segredos no Microsoft Entra mostrando onde gerar o Client Secret"
                    className="w-full h-auto"
                    loading="lazy"
                  />
                </div>
                <Alert className="border-amber-500/40 bg-amber-500/5">
                  <Info className="h-4 w-4 text-amber-500" />
                  <AlertDescription className="text-xs">
                    <strong>Atenção:</strong> copie o valor da coluna <strong>"Valor" (Value)</strong>, e <u>não</u> o da coluna <strong>"ID do Segredo" (Secret ID)</strong>. O Valor só fica visível uma única vez — se sair da tela, terá que gerar um novo segredo. O Valor costuma ter ~40 caracteres com letras, números e símbolos (ex.: <code>abc1~XyZ...8Q</code>).
                  </AlertDescription>
                </Alert>
              </div>

              <div className="space-y-3">
                <p><strong>4. {t("onboarding.configurePermissions")}</strong></p>
                <p className="text-xs">
                  Ainda dentro do app, abra <strong>Permissões de API</strong> → <strong>Adicionar permissão</strong> → <strong>Power BI Service</strong>. Como usamos o fluxo ROPC (login com usuário e senha), todas devem ser do tipo <strong>Permissões delegadas</strong>:
                </p>
                <ul className="text-xs list-disc pl-5 space-y-1">
                  <li><code>App.Read.All</code></li>
                  <li><code>Dashboard.Read.All</code></li>
                  <li><code>Dataset.Read.All</code></li>
                  <li><code>Dataset.ReadWrite.All</code> <span className="text-muted-foreground">(necessário para atualização manual de datasets)</span></li>
                  <li><code>Report.Read.All</code></li>
                  <li><code>Workspace.Read.All</code></li>
                  <li><code>Tenant.Read.All</code> <span className="text-muted-foreground">(opcional, usado por alguns recursos administrativos)</span></li>
                </ul>
                <p className="text-xs">
                  Adicione também a permissão padrão do Microsoft Graph (<code>User.Read</code> — delegada) que já vem por padrão.
                </p>
                <Alert className="border-primary/30 bg-primary/5">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-xs">
                    <strong>Conceder consentimento do administrador:</strong> depois de adicionar as permissões, clique em <strong>"Conceder consentimento do administrador para [seu tenant]"</strong> e confirme. Todas as linhas precisam ficar com o ícone verde <strong>"Concedido para..."</strong>. Sem esse passo o login retorna o erro <code>AADSTS65001 / consent_required</code>.
                  </AlertDescription>
                </Alert>
              </div>

              <div className="space-y-2">
                <p><strong>5. Permitir o fluxo ROPC (cliente público)</strong></p>
                <p className="text-xs">
                  No menu lateral do app, abra <strong>Autenticação</strong> → role até o final → em <strong>"Permitir fluxos de cliente público"</strong> selecione <strong>Sim</strong> e salve. Sem isso, o login com usuário/senha do Power BI falha com <code>unauthorized_client</code>.
                </p>
              </div>

              <div className="space-y-2">
                <p><strong>6. Habilitar APIs do Power BI no tenant</strong></p>
                <p className="text-xs">
                  Acesse o <a href="https://app.powerbi.com/admin-portal/tenantSettings" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Portal de administração do Power BI <ExternalLink className="h-3 w-3" /></a> → <strong>Configurações do locatário</strong> → seção <strong>Configurações de desenvolvedor</strong> e habilite:
                </p>
                <ul className="text-xs list-disc pl-5 space-y-1">
                  <li><strong>Permitir que entidades de serviço usem APIs do Power BI</strong> (caso utilize service principal)</li>
                  <li><strong>Inserir conteúdo em aplicativos</strong> (Embed content in apps)</li>
                  <li><strong>Permitir que entidades de serviço criem e usem perfis</strong> (opcional)</li>
                </ul>
                <p className="text-xs">
                  Recomenda-se aplicar a "grupos de segurança específicos" e adicionar o usuário/grupo do Power BI usado nas credenciais.
                </p>
              </div>

              <div className="space-y-2">
                <p><strong>7. Usuário Power BI (Master User)</strong></p>
                <p className="text-xs">
                  O usuário e senha informados precisam: (a) pertencer ao <strong>mesmo tenant</strong> do Tenant ID configurado; (b) ter <strong>licença Power BI Pro</strong> (ou PPU) ativa; (c) ter acesso de visualização aos workspaces dos relatórios; (d) <strong>não ter MFA</strong> habilitado — o fluxo ROPC não suporta autenticação multifator. Crie um usuário de serviço dedicado no Entra ID se necessário.
                </p>
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
                {t("onboarding.saving")}
              </>
            ) : (
              <>
                {t("onboarding.continue")}
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