import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Key, ArrowLeft, User, Lock } from "lucide-react";
import { motion } from "framer-motion";

interface Credential {
  id: string;
  name: string;
  client_id: string;
  tenant_id: string;
  username?: string;
}

interface CredentialFormProps {
  credential?: Credential | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const CredentialForm = ({ credential, onSuccess, onCancel }: CredentialFormProps) => {
  const [name, setName] = useState(credential?.name || "");
  const [clientId, setClientId] = useState(credential?.client_id || "");
  const [clientSecret, setClientSecret] = useState("");
  const [tenantId, setTenantId] = useState(credential?.tenant_id || "");
  const [username, setUsername] = useState(credential?.username || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const isEditing = !!credential;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (isEditing) {
        // Update existing credential
        const updateData: Record<string, string> = {
          name,
          client_id: clientId,
          tenant_id: tenantId,
          username,
        };
        
        // Only update secrets if provided
        if (clientSecret) {
          updateData.client_secret = clientSecret;
        }
        if (password) {
          updateData.password = password;
        }

        const { error } = await supabase
          .from("power_bi_configs")
          .update(updateData)
          .eq("id", credential.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Credencial atualizada com sucesso",
        });
      } else {
        // Create new credential
        const { error } = await supabase
          .from("power_bi_configs")
          .insert({
            user_id: user.id,
            name,
            client_id: clientId,
            client_secret: clientSecret,
            tenant_id: tenantId,
            username,
            password,
          });

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Credencial criada com sucesso",
        });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro",
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
        Voltar
      </Button>

      <Card className="glass p-8 border-border/50">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-primary/10 p-4 rounded-xl">
            <Key className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {isEditing ? "Editar Credencial" : "Nova Credencial"}
            </h2>
            <p className="text-muted-foreground">
              {isEditing 
                ? "Atualize as informações da credencial" 
                : "Adicione suas credenciais do Microsoft Power BI"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Credencial</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Ex: Produção, Desenvolvimento"
              className="bg-background/50"
            />
          </div>

          {/* Azure AD App Section */}
          <div className="border border-border/50 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              Configuração Azure AD
            </h3>

            <div className="space-y-2">
              <Label htmlFor="tenantId">Tenant ID</Label>
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
              <Label htmlFor="clientId">Client ID (Application ID)</Label>
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
                Client Secret {isEditing && "(deixe em branco para manter)"}
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
              Conta Power BI (Master User)
            </h3>
            <p className="text-xs text-muted-foreground">
              Informe as credenciais da conta Microsoft com licença Power BI Pro/Premium que tem acesso aos workspaces.
            </p>

            <div className="space-y-2">
              <Label htmlFor="username">Email / Login</Label>
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
                Senha {isEditing && "(deixe em branco para manter)"}
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
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/90 shadow-glow"
              disabled={loading}
            >
              {loading ? "Salvando..." : isEditing ? "Salvar Alterações" : "Criar Credencial"}
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );
};

export default CredentialForm;
