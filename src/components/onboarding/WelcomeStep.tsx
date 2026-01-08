import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Rocket, 
  BarChart3, 
  Users, 
  Shield, 
  ChevronRight,
  Sparkles 
} from "lucide-react";

interface WelcomeStepProps {
  companyName: string;
  onStart: () => void;
  onSkip: () => void;
}

const WelcomeStep = ({ companyName, onStart, onSkip }: WelcomeStepProps) => {
  const features = [
    {
      icon: BarChart3,
      title: "Dashboards Power BI",
      description: "Conecte e visualize seus relatórios de forma segura",
    },
    {
      icon: Users,
      title: "Gestão de Usuários",
      description: "Convide sua equipe e controle permissões",
    },
    {
      icon: Shield,
      title: "Segurança Avançada",
      description: "Criptografia e controle de acesso por RLS",
    },
  ];

  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center mb-6 shadow-glow"
      >
        <Rocket className="h-10 w-10 text-primary-foreground" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-3xl font-bold mb-2">
          Bem-vindo, {companyName}! 
          <Sparkles className="inline-block ml-2 h-6 w-6 text-yellow-500" />
        </h2>
        <p className="text-muted-foreground text-lg mb-8">
          Vamos configurar sua plataforma em poucos minutos
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="grid gap-4 mb-8"
      >
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border/50 text-left"
          >
            <div className="p-2 rounded-lg bg-primary/10">
              <feature.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="space-y-3"
      >
        <Button
          onClick={onStart}
          size="lg"
          className="w-full bg-primary hover:bg-primary/90 shadow-glow"
        >
          Começar Configuração
          <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          onClick={onSkip}
          className="w-full text-muted-foreground"
        >
          Configurar depois
        </Button>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-6 text-xs text-muted-foreground"
      >
        ⏱️ Tempo estimado: 3-5 minutos
      </motion.p>
    </div>
  );
};

export default WelcomeStep;
