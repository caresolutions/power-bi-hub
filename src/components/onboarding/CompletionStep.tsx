import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  BarChart3, 
  Users, 
  Settings,
  ArrowRight,
  Sparkles
} from "lucide-react";

interface CompletionStepProps {
  stats: {
    dashboardsCount: number;
  };
  onGoToDashboards: () => void;
  onInviteUsers: () => void;
  onGoToSettings: () => void;
}

const CompletionStep = ({ 
  stats, 
  onGoToDashboards, 
  onInviteUsers,
  onGoToSettings 
}: CompletionStepProps) => {
  const nextSteps = [
    {
      icon: BarChart3,
      title: "Ver Dashboards",
      description: `${stats.dashboardsCount} dashboard${stats.dashboardsCount > 1 ? 's' : ''} configurado${stats.dashboardsCount > 1 ? 's' : ''}`,
      action: onGoToDashboards,
      primary: true,
    },
    {
      icon: Users,
      title: "Convidar Usuários",
      description: "Adicione sua equipe à plataforma",
      action: onInviteUsers,
      primary: false,
    },
    {
      icon: Settings,
      title: "Personalizar",
      description: "Ajuste cores e configurações",
      action: onGoToSettings,
      primary: false,
    },
  ];

  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="mx-auto w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mb-6 shadow-lg"
      >
        <CheckCircle2 className="h-12 w-12 text-white" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
          Configuração Concluída!
          <Sparkles className="h-6 w-6 text-yellow-500" />
        </h2>
        <p className="text-muted-foreground text-lg mb-8">
          Sua plataforma está pronta para uso
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="grid gap-3 mb-8"
      >
        {nextSteps.map((step, index) => (
          <motion.button
            key={step.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + index * 0.1 }}
            onClick={step.action}
            className={`flex items-center gap-4 p-4 rounded-lg border text-left transition-all hover:scale-[1.02] ${
              step.primary 
                ? 'bg-primary/10 border-primary/30 hover:bg-primary/20' 
                : 'bg-muted/30 border-border/50 hover:bg-muted/50'
            }`}
          >
            <div className={`p-2 rounded-lg ${
              step.primary ? 'bg-primary/20' : 'bg-muted'
            }`}>
              <step.icon className={`h-5 w-5 ${
                step.primary ? 'text-primary' : 'text-muted-foreground'
              }`} />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
            <ArrowRight className={`h-5 w-5 ${
              step.primary ? 'text-primary' : 'text-muted-foreground'
            }`} />
          </motion.button>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20"
      >
        <p className="text-sm text-muted-foreground">
          💡 <strong>Dica:</strong> Você pode acessar todas essas opções a qualquer momento 
          pelo menu lateral ou nas Configurações.
        </p>
      </motion.div>
    </div>
  );
};

export default CompletionStep;
