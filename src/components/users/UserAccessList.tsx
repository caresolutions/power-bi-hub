import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserMinus, Mail } from "lucide-react";
import { motion } from "framer-motion";

interface UserAccessListProps {
  dashboardId: string;
  onAccessRevoked: () => void;
}

interface UserAccess {
  id: string;
  user_id: string;
  created_at: string;
  profile: {
    email: string;
    full_name: string | null;
  };
}

const UserAccessList = ({ dashboardId, onAccessRevoked }: UserAccessListProps) => {
  const [users, setUsers] = useState<UserAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserAccess();
  }, [dashboardId]);

  const fetchUserAccess = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_dashboard_access")
        .select(`
          id,
          user_id,
          created_at,
          profiles:user_id (
            email,
            full_name
          )
        `)
        .eq("dashboard_id", dashboardId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transform the data to match our interface
      const transformedData = data?.map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        created_at: item.created_at,
        profile: {
          email: item.profiles?.email || "Email não disponível",
          full_name: item.profiles?.full_name
        }
      })) || [];

      setUsers(transformedData);
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

  const handleRevokeAccess = async (accessId: string, email: string) => {
    try {
      setRevoking(accessId);
      
      const { error } = await supabase
        .from("user_dashboard_access")
        .delete()
        .eq("id", accessId);

      if (error) throw error;

      toast({
        title: "Acesso revogado",
        description: `O acesso de ${email} foi removido.`,
      });

      // Remove from local state
      setUsers(users.filter(u => u.id !== accessId));
      onAccessRevoked();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRevoking(null);
    }
  };

  if (loading) {
    return (
      <Card className="glass p-8 text-center border-border/50">
        <p className="text-muted-foreground">Carregando usuários...</p>
      </Card>
    );
  }

  return (
    <Card className="glass p-6 border-border/50">
      <h2 className="text-xl font-bold mb-6">
        Usuários com Acesso ({users.length})
      </h2>

      {users.length === 0 ? (
        <div className="text-center py-8">
          <Mail className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">
            Nenhum usuário tem acesso a este dashboard ainda
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Use o botão "Convidar Usuário" para adicionar pessoas
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-4 flex items-center justify-between bg-card/50 border-border/50">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{user.profile.email}</p>
                  </div>
                  {user.profile.full_name && (
                    <p className="text-sm text-muted-foreground ml-6">
                      {user.profile.full_name}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground ml-6 mt-1">
                    Acesso concedido em {new Date(user.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRevokeAccess(user.id, user.profile.email)}
                  disabled={revoking === user.id}
                >
                  <UserMinus className="mr-2 h-4 w-4" />
                  {revoking === user.id ? "Removendo..." : "Revogar"}
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default UserAccessList;
