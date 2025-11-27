import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Search } from "lucide-react";
import { Card } from "@/components/ui/card";

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboardId: string;
  onUserInvited: () => void;
}

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
}

const InviteUserDialog = ({
  open,
  onOpenChange,
  dashboardId,
  onUserInvited,
}: InviteUserDialogProps) => {
  const [searchEmail, setSearchEmail] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchProfiles();
    }
  }, [open]);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .order("email");

      if (error) throw error;
      setProfiles(data || []);
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

  const handleInviteUser = async (userId: string) => {
    try {
      setInviting(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Check if access already exists
      const { data: existingAccess } = await supabase
        .from("user_dashboard_access")
        .select("id")
        .eq("dashboard_id", dashboardId)
        .eq("user_id", userId)
        .single();

      if (existingAccess) {
        toast({
          title: "Usuário já tem acesso",
          description: "Este usuário já possui acesso a este dashboard.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("user_dashboard_access")
        .insert({
          dashboard_id: dashboardId,
          user_id: userId,
          granted_by: user.id,
        });

      if (error) throw error;

      toast({
        title: "Acesso concedido!",
        description: "O usuário agora tem acesso ao dashboard.",
      });

      onUserInvited();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  };

  const filteredProfiles = profiles.filter(
    (profile) =>
      profile.email.toLowerCase().includes(searchEmail.toLowerCase()) ||
      profile.full_name?.toLowerCase().includes(searchEmail.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Convidar Usuário</DialogTitle>
          <DialogDescription>
            Selecione um usuário existente para dar acesso ao dashboard
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-auto">
          <div className="space-y-2">
            <Label htmlFor="search">Buscar Usuário</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                type="text"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="Digite o email ou nome..."
                className="pl-10 bg-background/50"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Carregando usuários...</p>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <Card className="p-8 text-center border-border/50">
              <UserPlus className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">
                {searchEmail
                  ? "Nenhum usuário encontrado com este termo"
                  : "Nenhum usuário cadastrado no sistema"}
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredProfiles.map((profile) => (
                <Card
                  key={profile.id}
                  className="p-4 flex items-center justify-between border-border/50 hover:border-primary/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium">{profile.email}</p>
                    {profile.full_name && (
                      <p className="text-sm text-muted-foreground">
                        {profile.full_name}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() => handleInviteUser(profile.id)}
                    disabled={inviting}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Conceder Acesso
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteUserDialog;
