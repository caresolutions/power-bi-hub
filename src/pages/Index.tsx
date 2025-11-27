import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, Lock, Users, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: BarChart3,
      title: "Power BI Embedded",
      description: "Publique e compartilhe dashboards Power BI de forma profissional e segura"
    },
    {
      icon: Lock,
      title: "Controle de Acesso",
      description: "Gerencie permissões e controle quem pode visualizar cada dashboard"
    },
    {
      icon: Users,
      title: "Multi-usuário",
      description: "Cobrança por usuário com gestão completa de contas e acessos"
    },
    {
      icon: Zap,
      title: "Configuração Rápida",
      description: "Setup simples com Azure AD em apenas 2 passos"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-50" />
        
        <div className="container relative mx-auto px-6 pt-32 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
              Publique seus{" "}
              <span className="gradient-text">
                Dashboards Power BI
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
              A plataforma profissional para compartilhar dashboards Power BI com sua equipe.
              Controle de acesso, segurança e cobrança por usuário.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="text-lg h-14 px-8 bg-primary hover:bg-primary/90 shadow-glow"
                onClick={() => navigate("/auth")}
              >
                Começar Agora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg h-14 px-8 border-border/50"
              >
                Ver Demonstração
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-card/30">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">
              Recursos Principais
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Tudo que você precisa para gerenciar e compartilhar seus dashboards Power BI
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="glass p-8 rounded-2xl border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-glow"
              >
                <div className="bg-primary/10 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                  <feature.icon className="h-7 w-7 text-primary" />
                </div>
                
                <h3 className="text-xl font-bold mb-3">
                  {feature.title}
                </h3>
                
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass max-w-4xl mx-auto p-12 rounded-3xl border border-border/50 text-center"
          >
            <h2 className="text-4xl font-bold mb-6">
              Pronto para começar?
            </h2>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Configure sua conta em minutos e comece a compartilhar dashboards Power BI com sua equipe hoje mesmo.
            </p>
            
            <Button 
              size="lg" 
              className="text-lg h-14 px-8 bg-primary hover:bg-primary/90 shadow-glow"
              onClick={() => navigate("/auth")}
            >
              Criar Conta Gratuita
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Index;
