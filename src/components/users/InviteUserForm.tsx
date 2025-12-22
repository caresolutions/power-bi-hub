import { useState, useMemo } from "react";
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
import { Mail, ArrowLeft, Send, Search, Shield, Eye } from "lucide-react";
import { motion } from "framer-motion";

interface Dashboard {
  id: string;
  name: string;
}

interface InviteUserFormProps {
  dashboards: Dashboard[];
  onSuccess: () => void;
  onCancel: () => void;
}

const InviteUserForm = ({ dashboards, onSuccess, onCancel }: InviteUserFormProps) => {
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<"admin" | "user">("user");
  const [selectedDashboards, setSelectedDashboards] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Filter dashboards based on search query
  const filteredDashboards = useMemo(() => {
    if (!searchQuery.trim()) return dashboards;
    return dashboards.filter(dashboard =>
      dashboard.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [dashboards, searchQuery]);

  const generateToken = () => {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const handleDashboardToggle = (dashboardId: string) => {
    setSelectedDashboards(prev => 
      prev.includes(dashboardId)
        ? prev.filter(id => id !== dashboardId)
        : [...prev, dashboardId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only require dashboards for user role
    if (selectedRole === "user" && selectedDashboards.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um dashboard para usuários visualizadores",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Get admin's company_id
      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!adminProfile?.company_id) {
        throw new Error("Empresa não configurada");
      }

      // Get selected dashboard names for email
      const selectedDashboardNames = dashboards
        .filter(d => selectedDashboards.includes(d.id))
        .map(d => d.name);

      const dashboardListHtml = selectedDashboardNames
        .map(name => `<li style="margin: 8px 0; color: #334155;">${name}</li>`)
        .join('');

      const roleLabel = selectedRole === "admin" ? "Administrador" : "Visualizador";

      // Check if user already exists in profiles
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("email", email)
        .maybeSingle();

      if (existingProfile) {
        // User already exists - grant access immediately
        // First, get existing profile's company to check if it's from the same company or needs to be set
        const { data: existingProfileFull } = await supabase
          .from("profiles")
          .select("id, company_id")
          .eq("id", existingProfile.id)
          .single();

        // If user has no company, set it to admin's company
        // If user has a different company, show error
        if (existingProfileFull?.company_id && existingProfileFull.company_id !== adminProfile.company_id) {
          toast({
            title: "Erro",
            description: "Este usuário pertence a outra empresa e não pode receber acesso.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Update user's company_id if not set
        if (!existingProfileFull?.company_id) {
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ company_id: adminProfile.company_id })
            .eq("id", existingProfile.id);

          if (updateError) {
            console.error("Error updating profile company:", updateError);
          }
        }

        // Check which dashboards user already has access to
        const { data: existingAccess } = await supabase
          .from("user_dashboard_access")
          .select("dashboard_id")
          .eq("user_id", existingProfile.id);

        const existingDashboardIds = existingAccess?.map(a => a.dashboard_id) || [];
        const newDashboardIds = selectedDashboards.filter(id => !existingDashboardIds.includes(id));

        if (newDashboardIds.length === 0) {
          toast({
            title: "Aviso",
            description: "O usuário já possui acesso a todos os dashboards selecionados",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Grant access to new dashboards
        const accessEntries = newDashboardIds.map(dashboardId => ({
          dashboard_id: dashboardId,
          user_id: existingProfile.id,
          granted_by: user.id,
        }));

        const { error: accessError } = await supabase
          .from("user_dashboard_access")
          .insert(accessEntries);

        if (accessError) throw accessError;

        // Get names of newly granted dashboards
        const newDashboardNames = dashboards
          .filter(d => newDashboardIds.includes(d.id))
          .map(d => d.name);

        const newDashboardListHtml = newDashboardNames
          .map(name => `<li style="margin: 8px 0; color: #334155;">${name}</li>`)
          .join('');

        // Send email informing about new dashboard access
        const loginLink = `${window.location.origin}/auth`;
        
        const emailContent = `
          <h2 style="color: #0891b2; margin-bottom: 24px;">Novos dashboards disponíveis!</h2>
          <p style="color: #334155; font-size: 16px; line-height: 1.6;">
            Você recebeu acesso a novos dashboards na plataforma Care BI.
          </p>
          <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-top: 16px;">
            <strong>Dashboards liberados:</strong>
          </p>
          <ul style="margin: 16px 0; padding-left: 24px;">
            ${newDashboardListHtml}
          </ul>
          <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-top: 24px;">
            Clique no botão abaixo para acessar a plataforma:
          </p>
        `;

        await supabase.functions.invoke("send-email", {
          body: {
            to: email,
            subject: "Novos dashboards disponíveis - Care BI",
            htmlContent: getEmailTemplate(emailContent, loginLink, "Acessar Plataforma"),
          },
        });

        toast({
          title: "Acesso concedido!",
          description: `${newDashboardIds.length} dashboard(s) liberado(s) para ${email}`,
        });

        onSuccess();
      } else {
        // User doesn't exist - create user directly with temporary password
        const roleLabel = selectedRole === "admin" ? "Administrador" : "Visualizador";

        // Call edge function to create user with temporary password
        const { data: createData, error: createError } = await supabase.functions.invoke(
          "create-invited-user",
          {
            body: {
              email,
              companyId: adminProfile.company_id,
              dashboardIds: selectedRole === "user" ? selectedDashboards : [],
              invitedBy: user.id,
              invitedRole: selectedRole,
            },
          }
        );

        if (createError || !createData?.success) {
          throw new Error(createError?.message || createData?.error || "Erro ao criar usuário");
        }

        const temporaryPassword = createData.temporaryPassword;

        // Build dashboard list for email
        const selectedDashboardNames = dashboards
          .filter(d => selectedDashboards.includes(d.id))
          .map(d => d.name);

        const dashboardListHtml = selectedDashboardNames
          .map(name => `<li style="margin: 8px 0; color: #334155;">${name}</li>`)
          .join('');

        const loginLink = `${window.location.origin}/auth`;

        const roleDescription = selectedRole === "admin" 
          ? "Como administrador, você terá acesso completo para gerenciar dashboards, credenciais e usuários."
          : "Como visualizador, você terá acesso aos dashboards selecionados abaixo:";

        const dashboardSection = selectedRole === "user" && selectedDashboards.length > 0 
          ? `
            <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-top: 16px;">
              <strong>Dashboards disponíveis para você:</strong>
            </p>
            <ul style="margin: 16px 0; padding-left: 24px;">
              ${dashboardListHtml}
            </ul>
          ` 
          : "";

        const emailContent = `
          <h2 style="color: #0891b2; margin-bottom: 24px;">Bem-vindo ao Care BI!</h2>
          <p style="color: #334155; font-size: 16px; line-height: 1.6;">
            Você foi cadastrado na plataforma Care BI como <strong>${roleLabel}</strong>.
          </p>
          <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-top: 16px;">
            ${roleDescription}
          </p>
          ${dashboardSection}
          <div style="background-color: #f0f9ff; border: 1px solid #0891b2; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="color: #0891b2; font-size: 14px; font-weight: 600; margin: 0 0 12px 0;">
              Suas credenciais de acesso:
            </p>
            <p style="color: #334155; font-size: 16px; margin: 0;">
              <strong>E-mail:</strong> ${email}<br/>
              <strong>Senha provisória:</strong> ${temporaryPassword}
            </p>
          </div>
          <p style="color: #dc2626; font-size: 14px; line-height: 1.6; margin-top: 16px;">
            <strong>Importante:</strong> Por segurança, você será solicitado a alterar sua senha no primeiro acesso.
          </p>
          <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-top: 24px;">
            Clique no botão abaixo para acessar a plataforma:
          </p>
        `;

        const { error: emailError } = await supabase.functions.invoke("send-email", {
          body: {
            to: email,
            subject: "Bem-vindo ao Care BI - Suas credenciais de acesso",
            htmlContent: getEmailTemplate(emailContent, loginLink, "Acessar Plataforma"),
          },
        });

        if (emailError) {
          console.error("Error sending email:", emailError);
          toast({
            title: "Usuário criado",
            description: `E-mail não pôde ser enviado. Senha provisória: ${temporaryPassword}`,
            variant: "default",
          });
        } else {
          toast({
            title: "Usuário criado!",
            description: `Credenciais enviadas para ${email}`,
          });
        }

        onSuccess();
      }
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

  const getEmailTemplate = (content: string, ctaUrl: string, ctaText: string): string => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Care BI</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Open Sans', Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Care BI</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              ${content}
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 30px;">
                <tr>
                  <td align="center">
                    <a href="${ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">${ctaText}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #64748b; font-size: 14px;">
                © ${new Date().getFullYear()} Care BI. Todos os direitos reservados.
              </p>
              <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 12px;">
                Este e-mail foi enviado automaticamente. Por favor, não responda.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
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
          <div className="bg-green-500/10 p-4 rounded-xl">
            <Mail className="h-8 w-8 text-green-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Convidar Usuário</h2>
            <p className="text-muted-foreground">
              Envie um convite por e-mail com acesso aos dashboards selecionados
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail do usuário</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="usuario@empresa.com"
              className="bg-background/50"
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo de acesso</Label>
            <Select value={selectedRole} onValueChange={(value: "admin" | "user") => setSelectedRole(value)}>
              <SelectTrigger className="bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span>Administrador</span>
                    <span className="text-xs text-muted-foreground">(acesso total)</span>
                  </div>
                </SelectItem>
                <SelectItem value="user">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span>Visualizador</span>
                    <span className="text-xs text-muted-foreground">(apenas dashboards)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {selectedRole === "admin" 
                ? "Administradores podem criar dashboards, gerenciar credenciais e convidar usuários."
                : "Visualizadores só podem acessar os dashboards selecionados abaixo."}
            </p>
          </div>

          {selectedRole === "user" && (
            <div className="space-y-4">
              <Label>Dashboards com acesso</Label>
              
              {dashboards.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum dashboard disponível. Crie um dashboard primeiro.
              </p>
            ) : (
              <>
                {/* Search field */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar dashboard pelo nome..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-background/50"
                  />
                </div>

                {/* Dashboard list */}
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                  {filteredDashboards.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum dashboard encontrado para "{searchQuery}"
                    </p>
                  ) : (
                    filteredDashboards.map((dashboard) => (
                      <div
                        key={dashboard.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg transition-colors cursor-pointer ${
                          selectedDashboards.includes(dashboard.id)
                            ? "bg-primary/20 border border-primary/30"
                            : "bg-background/30 hover:bg-background/50"
                        }`}
                        onClick={() => handleDashboardToggle(dashboard.id)}
                      >
                        <div 
                          className={`w-4 h-4 rounded-sm border flex items-center justify-center ${
                            selectedDashboards.includes(dashboard.id)
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-primary"
                          }`}
                        >
                          {selectedDashboards.includes(dashboard.id) && (
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm font-medium leading-none cursor-pointer flex-1">
                          {dashboard.name}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
            
              {selectedDashboards.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {selectedDashboards.length} dashboard(s) selecionado(s)
                </p>
              )}
            </div>
          )}

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
              disabled={loading || (selectedRole === "user" && dashboards.length === 0)}
            >
              <Send className="mr-2 h-4 w-4" />
              {loading ? "Enviando..." : "Enviar Convite"}
            </Button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
          <p className="text-sm text-primary">
            <strong>Nota:</strong> O convite será enviado automaticamente por e-mail para o usuário.
          </p>
        </div>
      </Card>
    </motion.div>
  );
};

export default InviteUserForm;
