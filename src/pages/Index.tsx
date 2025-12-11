import { useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, Lock, Users, Zap, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  // Reset to default colors on landing page
  useEffect(() => {
    const root = document.documentElement;
    root.style.removeProperty("--primary");
    root.style.removeProperty("--ring");
    root.style.removeProperty("--sidebar-primary");
    root.style.removeProperty("--sidebar-ring");
    root.style.removeProperty("--accent");
  }, []);

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
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-foreground tracking-tight">care</span>
            <ChevronRight className="h-5 w-5 text-primary" />
            <ChevronRight className="h-5 w-5 text-primary -ml-3" />
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#recursos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Recursos
            </a>
            <a href="#sobre" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sobre
            </a>
          </nav>
          
          <Button 
            variant="default"
            onClick={() => navigate("/auth")}
            className="bg-primary hover:bg-primary/90"
          >
            Acessar
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        
        <div className="container relative mx-auto px-6 pt-24 pb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            <p className="text-primary font-medium mb-4 uppercase tracking-wider text-sm">
              Care BI
            </p>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight text-foreground">
              Transformamos dados complexos{" "}
              <span className="text-primary">em insights</span>
            </h1>
            
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
              A plataforma profissional para compartilhar dashboards Power BI com sua equipe.
              Controle de acesso, segurança e as melhores metodologias em Business Intelligence.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="text-base h-12 px-8 bg-primary hover:bg-primary/90"
                onClick={() => navigate("/auth")}
              >
                Começar Agora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              
              <Button 
                size="lg" 
                variant="outline" 
                className="text-base h-12 px-8 border-primary/30 text-foreground hover:bg-primary/10"
              >
                Saiba Mais
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="recursos" className="py-24 bg-card/50">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <p className="text-primary font-medium mb-2 uppercase tracking-wider text-sm">
              Nossas Soluções
            </p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Recursos Principais
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tudo que você precisa para gerenciar e compartilhar seus dashboards Power BI
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-card p-6 rounded-lg border border-border/50 hover:border-primary/50 transition-all duration-300 group"
              >
                <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  {feature.title}
                </h3>
                
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="sobre" className="py-24">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-gradient-to-r from-primary/20 to-primary/5 max-w-4xl mx-auto p-12 rounded-2xl border border-primary/20 text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Pronto para começar?
            </h2>
            
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Configure sua conta em minutos e comece a compartilhar dashboards Power BI com sua equipe hoje mesmo.
            </p>
            
            <Button 
              size="lg" 
              className="text-base h-12 px-8 bg-primary hover:bg-primary/90"
              onClick={() => navigate("/auth")}
            >
              Criar Conta
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border/50">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-foreground">care</span>
              <ChevronRight className="h-4 w-4 text-primary" />
              <ChevronRight className="h-4 w-4 text-primary -ml-2" />
            </div>
            
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Care Business. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
