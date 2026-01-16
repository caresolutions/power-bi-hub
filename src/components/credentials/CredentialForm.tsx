import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Key, ArrowLeft, User, Lock, Building2 } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface Credential {
  id: string;
  name: string;
  client_id: string;
  tenant_id: string;
  username?: string;
  company_id?: string | null;
}

interface Company {
  id: string;
  name: string;
}

interface CredentialFormProps {
  credential?: Credential | null;
  onSuccess: () => void;
  onCancel: () => void;
  isMasterAdmin?: boolean;
  defaultCompanyId?: string;
}

const CredentialForm = ({ credential, onSuccess, onCancel, isMasterAdmin = false, defaultCompanyId }: CredentialFormProps) => {
  const { t } = useTranslation();
  const [name, setName] = useState(credential?.name || "");
  const [clientId, setClientId] = useState(credential?.client_id || "");
  const [clientSecret, setClientSecret] = useState("");
  const [tenantId, setTenantId] = useState(credential?.tenant_id || "");
  const [username, setUsername] = useState(credential?.username || "");
  const [password, setPassword] = useState("");
  const [companyId, setCompanyId] = useState(() => {
    if (credential) {
      return credential.company_id || "global";
    }
    return defaultCompanyId || (isMasterAdmin ? "global" : "");
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const isEditing = !!credential;

  useEffect(() => {
    if (isMasterAdmin) {
      fetchCompanies();
    }
  }, [isMasterAdmin]);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t("credentialForm.userNotAuth"));

      if (isEditing) {
        // Update existing credential via edge function (with encryption)
        const { data, error } = await supabase.functions.invoke("manage-credentials", {
          body: {
            action: "update",
            data: {
              id: credential.id,
              name,
              client_id: clientId,
              client_secret: clientSecret || undefined,
              tenant_id: tenantId,
              username,
              password: password || undefined,
              company_id: isMasterAdmin ? (companyId === "global" ? null : companyId) : undefined,
            },
          },
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || t("credentialForm.updateError"));

        toast({
          title: t("credentialForm.success"),
          description: t("credentialForm.credentialUpdated"),
        });
      } else {
        // Create new credential via edge function (with encryption)
        const { data, error } = await supabase.functions.invoke("manage-credentials", {
          body: {
            action: "create",
            data: {
              name,
              client_id: clientId,
              client_secret: clientSecret,
              tenant_id: tenantId,
              username,
              password,
              company_id: isMasterAdmin ? (companyId === "global" ? null : companyId) : undefined,
            },
          },
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || t("credentialForm.createError"));

        toast({
          title: t("credentialForm.success"),
          description: t("credentialForm.credentialCreated"),
        });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: t("credentialForm.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <Button variant="ghost" className="mb-6" onClick={onCancel}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t("credentialForm.back")}
      </Button>

      <Card className="glass p-8 border-border/50">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-primary/10 p-4 rounded-xl">
            <Key className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {isEditing ? t("credentialForm.editCredential") : t("credentialForm.newCredential")}
            </h2>
            <p className="text-muted-foreground">
              {isEditing 
                ? t("credentialForm.editCredentialDesc")
                : t("credentialForm.newCredentialDesc")}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company selector for Master Admin */}
          {isMasterAdmin && (
            <div className="space-y-2">
              <Label htmlFor="company" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {t("credentialForm.company")}
              </Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder={t("credentialForm.globalAllCompanies")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">🌐 {t("credentialForm.globalAllCompanies")}</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t("credentialForm.globalCredentialsHelp")}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">{t("credentialForm.credentialName")}</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder={t("credentialForm.credentialNamePlaceholder")}
              className="bg-background/50"
            />
          </div>

          {/* Azure AD App Section */}
          <div className="border border-border/50 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              {t("credentialForm.azureAdConfig")}
            </h3>

            <div className="space-y-2">
              <Label htmlFor="tenantId">{t("credentialForm.tenantId")}</Label>
              <Input
                id="tenantId"
                type="text"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                required
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="bg-background/50 font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientId">{t("credentialForm.clientId")}</Label>
              <Input
                id="clientId"
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="bg-background/50 font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientSecret">
                {isEditing ? t("credentialForm.clientSecretKeep") : t("credentialForm.clientSecret")}
              </Label>
              <Input
                id="clientSecret"
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                required={!isEditing}
                placeholder="••••••••••••••••"
                className="bg-background/50"
              />
            </div>
          </div>

          {/* Power BI Account Section */}
          <div className="border border-border/50 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <User className="h-4 w-4" />
              {t("credentialForm.powerBiAccount")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("credentialForm.powerBiAccountHelp")}
            </p>

            <div className="space-y-2">
              <Label htmlFor="username">{t("credentialForm.emailLogin")}</Label>
              <Input
                id="username"
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="usuario@empresa.onmicrosoft.com"
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-3 w-3" />
                {isEditing ? t("credentialForm.passwordKeep") : t("credentialForm.password")}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!isEditing}
                placeholder="••••••••••••••••"
                className="bg-background/50"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              {t("credentialForm.cancel")}
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/90 shadow-glow"
              disabled={loading}
            >
              {loading ? t("credentialForm.saving") : isEditing ? t("credentialForm.saveChanges") : t("credentialForm.createCredential")}
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );
};

export default CredentialForm;