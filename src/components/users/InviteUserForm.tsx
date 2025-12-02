import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { Mail, ArrowLeft, Send } from "lucide-react";
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
  const { toast } = useToast();

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

      // TODO: Send email with invitation link
      // For now, just show success message with the link
      const inviteLink = `${window.location.origin}/auth?invite=${token}`;
      
      toast({
        title: "Convite criado!",
        description: `Link de convite: ${inviteLink}`,
      });

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
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {dashboards.map((dashboard) => (
                  <div
                    key={dashboard.id}
                    className="flex items-center space-x-3 p-3 rounded-lg bg-background/30 hover:bg-background/50 transition-colors"
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
                ))}
              </div>
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

        <div className="mt-6 p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
          <p className="text-sm text-amber-500">
            <strong>Nota:</strong> O envio de e-mail será configurado em breve. 
            Por enquanto, copie o link de convite gerado e envie manualmente.
          </p>
        </div>
      </Card>
    </motion.div>
  );
};

export default InviteUserForm;
