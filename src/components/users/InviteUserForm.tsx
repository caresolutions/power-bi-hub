import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { Mail, ArrowLeft, Send, Search } from "lucide-react";
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
    
    if (selectedDashboards.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um dashboard",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Check if invitation already exists
      const { data: existingInvite } = await supabase
        .from("user_invitations")
        .select("id")
        .eq("email", email)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (existingInvite) {
        toast({
          title: "Aviso",
          description: "Já existe um convite pendente para este e-mail",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Create invitation
      const token = generateToken();
      const { error } = await supabase
        .from("user_invitations")
        .insert({
          email,
          invited_by: user.id,
          dashboard_ids: selectedDashboards,
          token,
        });

      if (error) throw error;

      // Get selected dashboard names for email
      const selectedDashboardNames = dashboards
        .filter(d => selectedDashboards.includes(d.id))
        .map(d => d.name);

      // Send invitation email
      const inviteLink = `${window.location.origin}/auth?invite=${token}`;
      
      const dashboardListHtml = selectedDashboardNames
        .map(name => `<li style="margin: 8px 0; color: #334155;">${name}</li>`)
        .join('');

      const emailContent = `
        <h2 style="color: #0891b2; margin-bottom: 24px;">Você foi convidado!</h2>
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          Você recebeu um convite para acessar a plataforma Care BI.
        </p>
        <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-top: 16px;">
          <strong>Dashboards disponíveis para você:</strong>
        </p>
        <ul style="margin: 16px 0; padding-left: 24px;">
          ${dashboardListHtml}
        </ul>
        <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-top: 24px;">
          Clique no botão abaixo para criar sua conta e acessar os dashboards:
        </p>
      `;

      const { error: emailError } = await supabase.functions.invoke("send-email", {
        body: {
          to: email,
          subject: "Convite para acessar Care BI",
          htmlContent: getEmailTemplate(emailContent, inviteLink, "Criar Conta"),
        },
      });

      if (emailError) {
        console.error("Error sending email:", emailError);
        toast({
          title: "Convite criado",
          description: `E-mail não pôde ser enviado. Link: ${inviteLink}`,
          variant: "default",
        });
      } else {
        toast({
          title: "Convite enviado!",
          description: `E-mail de convite enviado para ${email}`,
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
                        <Checkbox
                          id={dashboard.id}
                          checked={selectedDashboards.includes(dashboard.id)}
                          onCheckedChange={() => handleDashboardToggle(dashboard.id)}
                        />
                        <label
                          htmlFor={dashboard.id}
                          className="text-sm font-medium leading-none cursor-pointer flex-1"
                        >
                          {dashboard.name}
                        </label>
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
              disabled={loading || dashboards.length === 0}
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
