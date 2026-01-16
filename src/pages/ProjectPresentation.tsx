import { motion } from "framer-motion";
import { 
  Server, Users, CreditCard, Rocket, LayoutDashboard, Mail, 
  Shield, MessageSquare, Settings, Database, Lock, Building2,
  UserCheck, Crown, User, ChevronRight, Layers, Zap, Globe,
  BarChart3, FileText, Clock, RefreshCw, Bot, Bookmark,
  Star, Play, Download, Calendar, Bell, Palette, Key, FileEdit
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import logoCareBi from "@/assets/logo_care_azul.png";

const ProjectPresentation = () => {
  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(187,85%,97%)] via-white to-[hsl(195,80%,95%)]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[hsl(187,85%,85%)]">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <img src={logoCareBi} alt="Care BI" className="h-10" />
          <Badge className="bg-[hsl(187,85%,43%)] text-white hover:bg-[hsl(187,85%,38%)]">
            Resumo Executivo
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 space-y-16">
        {/* Hero Section */}
        <motion.section 
          className="text-center space-y-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[hsl(187,85%,35%)] to-[hsl(195,80%,40%)] bg-clip-text text-transparent">
            Care BI Platform
          </h1>
          <p className="text-xl text-[hsl(195,50%,35%)] max-w-3xl mx-auto">
            Plataforma completa de Business Intelligence com integração Power BI, 
            gestão multi-tenant e sistema de assinaturas.
          </p>
        </motion.section>

        {/* Architecture Overview */}
        <motion.section {...fadeIn} className="space-y-8">
          <SectionHeader 
            icon={<Layers className="w-6 h-6" />} 
            title="Arquitetura da Plataforma" 
            subtitle="Visão geral dos componentes e integrações"
          />
          
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-[hsl(187,85%,90%)]">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Frontend */}
              <ArchitectureCard
                title="Frontend"
                icon={<Globe className="w-8 h-8 text-[hsl(187,85%,43%)]" />}
                items={["React 18", "Vite", "TypeScript", "Tailwind CSS", "shadcn/ui", "Framer Motion"]}
                color="hsl(187,85%,43%)"
              />
              
              {/* Backend */}
              <ArchitectureCard
                title="Backend"
                icon={<Server className="w-8 h-8 text-[hsl(195,80%,35%)]" />}
                items={["Supabase", "PostgreSQL", "Edge Functions", "Row Level Security", "Realtime"]}
                color="hsl(195,80%,35%)"
              />
              
              {/* Integrações */}
              <ArchitectureCard
                title="Integrações"
                icon={<Zap className="w-8 h-8 text-[hsl(200,90%,40%)]" />}
                items={["Power BI API", "Stripe Payments", "Z-API (WhatsApp)", "Mailjet (Email)"]}
                color="hsl(200,90%,40%)"
              />
            </div>
            
            {/* Flow Diagram */}
            <div className="mt-8 p-6 bg-gradient-to-r from-[hsl(187,85%,97%)] to-[hsl(195,80%,97%)] rounded-xl">
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                <FlowStep icon={<User />} label="Usuário" />
                <ChevronRight className="w-5 h-5 text-[hsl(187,85%,50%)]" />
                <FlowStep icon={<Globe />} label="React App" />
                <ChevronRight className="w-5 h-5 text-[hsl(187,85%,50%)]" />
                <FlowStep icon={<Database />} label="Supabase" />
                <ChevronRight className="w-5 h-5 text-[hsl(187,85%,50%)]" />
                <FlowStep icon={<BarChart3 />} label="Power BI" />
              </div>
            </div>
          </div>
        </motion.section>

        {/* Technical Structure */}
        <motion.section {...fadeIn} className="space-y-8">
          <SectionHeader 
            icon={<Server className="w-6 h-6" />} 
            title="1. Estrutura Técnica" 
            subtitle="Stack tecnológico e infraestrutura"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <TechCard 
              title="Frontend" 
              icon={<Globe />}
              items={[
                { label: "Framework", value: "React + Vite" },
                { label: "Linguagem", value: "TypeScript" },
                { label: "Estilos", value: "Tailwind CSS" },
                { label: "Componentes", value: "shadcn/ui" },
                { label: "Animações", value: "Framer Motion" }
              ]}
            />
            
            <TechCard 
              title="Backend" 
              icon={<Server />}
              items={[
                { label: "Plataforma", value: "Supabase" },
                { label: "Banco de Dados", value: "PostgreSQL" },
                { label: "Funções", value: "Edge Functions (Deno)" },
                { label: "Segurança", value: "Row Level Security" }
              ]}
            />
            
            <TechCard 
              title="Integrações" 
              icon={<Zap />}
              items={[
                { label: "BI", value: "Power BI Embed API" },
                { label: "Pagamentos", value: "Stripe" },
                { label: "WhatsApp", value: "Z-API" },
                { label: "Email", value: "Mailjet" }
              ]}
            />
          </div>
        </motion.section>

        {/* Administrative Structure */}
        <motion.section {...fadeIn} className="space-y-8">
          <SectionHeader 
            icon={<Users className="w-6 h-6" />} 
            title="2. Estrutura Administrativa" 
            subtitle="Multi-tenancy e controle de acesso"
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Multi-tenant */}
            <Card className="border-[hsl(187,85%,85%)] shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="bg-gradient-to-r from-[hsl(187,85%,95%)] to-[hsl(195,80%,95%)]">
                <CardTitle className="flex items-center gap-3 text-[hsl(195,50%,25%)]">
                  <Building2 className="w-5 h-5 text-[hsl(187,85%,43%)]" />
                  Sistema Multi-tenant
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <FeatureItem icon={<Database />} text="Isolamento de dados por empresa (company_id)" />
                <FeatureItem icon={<Palette />} text="Customização visual por empresa" />
                <FeatureItem icon={<Lock />} text="Separação completa de recursos" />
              </CardContent>
            </Card>

            {/* RBAC */}
            <Card className="border-[hsl(187,85%,85%)] shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="bg-gradient-to-r from-[hsl(187,85%,95%)] to-[hsl(195,80%,95%)]">
                <CardTitle className="flex items-center gap-3 text-[hsl(195,50%,25%)]">
                  <Shield className="w-5 h-5 text-[hsl(187,85%,43%)]" />
                  Controle de Acesso (RBAC)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <RoleCard 
                    icon={<Crown className="w-5 h-5" />}
                    role="Master Admin"
                    description="Gerenciamento global de todas empresas"
                    color="hsl(45,90%,50%)"
                  />
                  <RoleCard 
                    icon={<UserCheck className="w-5 h-5" />}
                    role="Admin"
                    description="Gestão da própria empresa e usuários"
                    color="hsl(187,85%,43%)"
                  />
                  <RoleCard 
                    icon={<User className="w-5 h-5" />}
                    role="User"
                    description="Acesso aos dashboards permitidos"
                    color="hsl(195,80%,50%)"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* User Management */}
          <Card className="border-[hsl(187,85%,85%)] shadow-md">
            <CardHeader className="bg-gradient-to-r from-[hsl(187,85%,95%)] to-[hsl(195,80%,95%)]">
              <CardTitle className="flex items-center gap-3 text-[hsl(195,50%,25%)]">
                <Users className="w-5 h-5 text-[hsl(187,85%,43%)]" />
                Gestão de Usuários
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FeatureBox icon={<Mail />} title="Convites por Email" description="Com roles pré-definidos" />
                <FeatureBox icon={<Users />} title="Grupos de Usuários" description="Controle em massa" />
                <FeatureBox icon={<UserCheck />} title="Ativação/Desativação" description="Gerenciamento de acesso" />
                <FeatureBox icon={<Key />} title="Reset de Senha" description="Obrigatório no 1º acesso" />
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Financial Structure */}
        <motion.section {...fadeIn} className="space-y-8">
          <SectionHeader 
            icon={<CreditCard className="w-6 h-6" />} 
            title="3. Estrutura Financeira" 
            subtitle="Planos de assinatura e cobrança"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <PlanCard 
              name="Starter"
              price="R$ 99"
              features={["1 dashboard", "2 usuários"]}
              color="hsl(195,80%,50%)"
            />
            <PlanCard 
              name="Growth"
              price="R$ 249"
              features={["5 dashboards", "10 usuários"]}
              color="hsl(187,85%,43%)"
              highlighted
            />
            <PlanCard 
              name="Scale"
              price="R$ 499"
              features={["15 dashboards", "25 usuários"]}
              color="hsl(195,80%,35%)"
            />
            <PlanCard 
              name="Enterprise"
              price="Customizado"
              features={["Ilimitado", "Personalizado"]}
              color="hsl(200,90%,30%)"
            />
          </div>

          <Card className="border-[hsl(187,85%,85%)] shadow-md">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <FeatureBox icon={<Clock />} title="Trial Configurável" description="Por plano" />
                <FeatureBox icon={<Users />} title="Usuários Adicionais" description="Cobrança extra" />
                <FeatureBox icon={<CreditCard />} title="Portal Stripe" description="Autogestão" />
                <FeatureBox icon={<Bell />} title="Alertas Automáticos" description="Expiração de trial" />
                <FeatureBox icon={<Settings />} title="Planos Custom" description="Master Admin" />
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Customer Journey */}
        <motion.section {...fadeIn} className="space-y-8">
          <SectionHeader 
            icon={<Rocket className="w-6 h-6" />} 
            title="4. Jornada do Cliente" 
            subtitle="Do primeiro acesso à gestão completa"
          />
          
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-[hsl(187,85%,90%)]">
            <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4">
              <JourneyStep number={1} title="Landing Page" subtitle="Apresentação" active />
              <JourneyArrow />
              <JourneyStep number={2} title="Cadastro/Login" subtitle="Autenticação" />
              <JourneyArrow />
              <JourneyStep number={3} title="Onboarding" subtitle="Configuração" />
              <JourneyArrow />
              <JourneyStep number={4} title="Home" subtitle="Dashboards" />
              <JourneyArrow />
              <JourneyStep number={5} title="Visualização" subtitle="Power BI" />
              <JourneyArrow />
              <JourneyStep number={6} title="Gestão" subtitle="Admin" />
            </div>
          </div>
        </motion.section>

        {/* Dashboard Features */}
        <motion.section {...fadeIn} className="space-y-8">
          <SectionHeader 
            icon={<LayoutDashboard className="w-6 h-6" />} 
            title="5. Funcionalidades de Dashboards" 
            subtitle="Recursos avançados de visualização"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <DashboardFeatureCard icon={<LayoutDashboard />} title="Catálogo" description="Filtros por categoria, tags, favoritos" />
            <DashboardFeatureCard icon={<Star />} title="Favoritos" description="Salvamento rápido" />
            <DashboardFeatureCard icon={<Bookmark />} title="Bookmarks" description="Estados personalizados" />
            <DashboardFeatureCard icon={<Layers />} title="Navegação" description="Abas configuráveis" />
            <DashboardFeatureCard icon={<Play />} title="Modo Slider" description="Apresentação automática" />
            <DashboardFeatureCard icon={<Bot />} title="Chat com Dados" description="IA em linguagem natural" />
            <DashboardFeatureCard icon={<RefreshCw />} title="Refresh Dataset" description="Atualização manual" />
            <DashboardFeatureCard icon={<Download />} title="Exportação" description="PDF e PPTX com RLS" />
          </div>
        </motion.section>

        {/* Report Subscriptions */}
        <motion.section {...fadeIn} className="space-y-8">
          <SectionHeader 
            icon={<Mail className="w-6 h-6" />} 
            title="6. Assinaturas de Relatórios" 
            subtitle="Envio programado de relatórios"
          />
          
          <Card className="border-[hsl(187,85%,85%)] shadow-md">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <FeatureBox icon={<Calendar />} title="Frequências" description="Única, diária, semanal, mensal, intervalo" />
                <FeatureBox icon={<Shield />} title="RLS Aplicado" description="Por destinatário" />
                <FeatureBox icon={<Users />} title="Múltiplos Destinos" description="Por assinatura" />
                <FeatureBox icon={<FileText />} title="Formatos" description="PDF e PPTX" />
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Security */}
        <motion.section {...fadeIn} className="space-y-8">
          <SectionHeader 
            icon={<Shield className="w-6 h-6" />} 
            title="7. Segurança" 
            subtitle="Proteção de dados e conformidade"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SecurityCard icon={<Lock />} title="Row Level Security" description="RLS em todas as tabelas" />
            <SecurityCard icon={<Key />} title="Criptografia" description="Credenciais Power BI seguras" />
            <SecurityCard icon={<FileText />} title="Logs de Acesso" description="Por dashboard e página" />
            <SecurityCard icon={<FileEdit />} title="Políticas" description="Cancelamento e privacidade" />
            <SecurityCard icon={<UserCheck />} title="LGPD" description="Conformidade total" />
            <SecurityCard icon={<Shield />} title="Consentimento" description="Termos obrigatórios" />
          </div>
        </motion.section>

        {/* Support */}
        <motion.section {...fadeIn} className="space-y-8">
          <SectionHeader 
            icon={<MessageSquare className="w-6 h-6" />} 
            title="8. Suporte" 
            subtitle="Atendimento integrado"
          />
          
          <Card className="border-[hsl(187,85%,85%)] shadow-md">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FeatureBox icon={<MessageSquare />} title="Chat WhatsApp" description="Integrado via Z-API" />
                <FeatureBox icon={<Clock />} title="Histórico" description="Mensagens por usuário" />
                <FeatureBox icon={<Zap />} title="Webhook" description="Recebimento de respostas" />
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Admin Settings */}
        <motion.section {...fadeIn} className="space-y-8">
          <SectionHeader 
            icon={<Settings className="w-6 h-6" />} 
            title="9. Configurações Administrativas" 
            subtitle="Personalização e gestão"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureBox icon={<Palette />} title="Customização Visual" description="Cores, logo, fontes" />
            <FeatureBox icon={<Key />} title="Credenciais Power BI" description="Múltiplas configurações" />
            <FeatureBox icon={<Building2 />} title="Compartilhamento" description="Credenciais entre empresas" />
            <FeatureBox icon={<FileEdit />} title="Termos Legais" description="Edição de políticas" />
          </div>
        </motion.section>

        {/* Footer */}
        <footer className="text-center pt-12 pb-8 border-t border-[hsl(187,85%,85%)]">
          <img src={logoCareBi} alt="Care BI" className="h-8 mx-auto mb-4" />
          <p className="text-sm text-[hsl(195,50%,45%)]">
            © {new Date().getFullYear()} Care BI Platform. Todos os direitos reservados.
          </p>
        </footer>
      </main>
    </div>
  );
};

// Component Helpers
const SectionHeader = ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) => (
  <div className="flex items-center gap-4">
    <div className="p-3 bg-gradient-to-br from-[hsl(187,85%,43%)] to-[hsl(195,80%,35%)] rounded-xl text-white shadow-lg">
      {icon}
    </div>
    <div>
      <h2 className="text-2xl font-bold text-[hsl(195,50%,20%)]">{title}</h2>
      <p className="text-[hsl(195,50%,45%)]">{subtitle}</p>
    </div>
  </div>
);

const ArchitectureCard = ({ title, icon, items, color }: { title: string; icon: React.ReactNode; items: string[]; color: string }) => (
  <div className="p-6 rounded-xl border-2 border-[hsl(187,85%,90%)] hover:border-[hsl(187,85%,70%)] transition-colors">
    <div className="flex items-center gap-3 mb-4">
      {icon}
      <h3 className="font-semibold text-[hsl(195,50%,25%)]">{title}</h3>
    </div>
    <div className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <Badge 
          key={index} 
          variant="secondary" 
          className="bg-[hsl(187,85%,95%)] text-[hsl(195,50%,30%)] hover:bg-[hsl(187,85%,90%)]"
        >
          {item}
        </Badge>
      ))}
    </div>
  </div>
);

const FlowStep = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-[hsl(187,85%,85%)]">
    <span className="text-[hsl(187,85%,43%)]">{icon}</span>
    <span className="text-[hsl(195,50%,30%)] font-medium">{label}</span>
  </div>
);

const TechCard = ({ title, icon, items }: { title: string; icon: React.ReactNode; items: { label: string; value: string }[] }) => (
  <Card className="border-[hsl(187,85%,85%)] shadow-md hover:shadow-lg transition-shadow">
    <CardHeader className="bg-gradient-to-r from-[hsl(187,85%,95%)] to-[hsl(195,80%,95%)]">
      <CardTitle className="flex items-center gap-3 text-[hsl(195,50%,25%)]">
        <span className="text-[hsl(187,85%,43%)]">{icon}</span>
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="pt-4 space-y-3">
      {items.map((item, index) => (
        <div key={index} className="flex justify-between items-center text-sm">
          <span className="text-[hsl(195,50%,45%)]">{item.label}</span>
          <Badge variant="outline" className="border-[hsl(187,85%,70%)] text-[hsl(195,50%,30%)]">
            {item.value}
          </Badge>
        </div>
      ))}
    </CardContent>
  </Card>
);

const FeatureItem = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <div className="flex items-center gap-3">
    <span className="text-[hsl(187,85%,43%)]">{icon}</span>
    <span className="text-[hsl(195,50%,30%)]">{text}</span>
  </div>
);

const RoleCard = ({ icon, role, description, color }: { icon: React.ReactNode; role: string; description: string; color: string }) => (
  <div 
    className="flex items-center gap-4 p-3 rounded-lg"
    style={{ backgroundColor: `${color}15` }}
  >
    <div 
      className="p-2 rounded-lg"
      style={{ backgroundColor: color, color: 'white' }}
    >
      {icon}
    </div>
    <div>
      <p className="font-semibold text-[hsl(195,50%,25%)]">{role}</p>
      <p className="text-sm text-[hsl(195,50%,45%)]">{description}</p>
    </div>
  </div>
);

const FeatureBox = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="p-4 rounded-xl bg-gradient-to-br from-[hsl(187,85%,97%)] to-[hsl(195,80%,97%)] border border-[hsl(187,85%,90%)] hover:shadow-md transition-shadow">
    <div className="text-[hsl(187,85%,43%)] mb-2">{icon}</div>
    <h4 className="font-semibold text-[hsl(195,50%,25%)] text-sm">{title}</h4>
    <p className="text-xs text-[hsl(195,50%,45%)]">{description}</p>
  </div>
);

const PlanCard = ({ name, price, features, color, highlighted }: { name: string; price: string; features: string[]; color: string; highlighted?: boolean }) => (
  <Card 
    className={`border-2 transition-all hover:scale-105 ${highlighted ? 'border-[hsl(187,85%,43%)] shadow-lg' : 'border-[hsl(187,85%,85%)]'}`}
  >
    <CardHeader 
      className="text-center pb-2"
      style={{ background: highlighted ? `linear-gradient(135deg, ${color}20, ${color}10)` : undefined }}
    >
      {highlighted && (
        <Badge className="w-fit mx-auto mb-2 bg-[hsl(187,85%,43%)] text-white">
          Mais Popular
        </Badge>
      )}
      <CardTitle className="text-xl" style={{ color }}>{name}</CardTitle>
      <p className="text-2xl font-bold text-[hsl(195,50%,25%)]">{price}<span className="text-sm font-normal text-[hsl(195,50%,45%)]">/mês</span></p>
    </CardHeader>
    <CardContent>
      <ul className="space-y-2">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center gap-2 text-sm text-[hsl(195,50%,35%)]">
            <ChevronRight className="w-4 h-4 text-[hsl(187,85%,43%)]" />
            {feature}
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
);

const JourneyStep = ({ number, title, subtitle, active }: { number: number; title: string; subtitle: string; active?: boolean }) => (
  <div className={`text-center p-4 rounded-xl transition-all ${active ? 'bg-gradient-to-br from-[hsl(187,85%,43%)] to-[hsl(195,80%,35%)] text-white shadow-lg' : 'bg-[hsl(187,85%,97%)]'}`}>
    <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 font-bold ${active ? 'bg-white text-[hsl(187,85%,43%)]' : 'bg-[hsl(187,85%,90%)] text-[hsl(187,85%,43%)]'}`}>
      {number}
    </div>
    <p className="font-semibold text-sm">{title}</p>
    <p className={`text-xs ${active ? 'text-white/80' : 'text-[hsl(195,50%,45%)]'}`}>{subtitle}</p>
  </div>
);

const JourneyArrow = () => (
  <ChevronRight className="w-6 h-6 text-[hsl(187,85%,50%)] hidden md:block" />
);

const DashboardFeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <Card className="border-[hsl(187,85%,85%)] hover:border-[hsl(187,85%,60%)] transition-colors group">
    <CardContent className="pt-6 text-center">
      <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-[hsl(187,85%,43%)] to-[hsl(195,80%,35%)] text-white flex items-center justify-center group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h4 className="font-semibold text-[hsl(195,50%,25%)]">{title}</h4>
      <p className="text-sm text-[hsl(195,50%,45%)]">{description}</p>
    </CardContent>
  </Card>
);

const SecurityCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-br from-[hsl(187,85%,97%)] to-white border border-[hsl(187,85%,90%)]">
    <div className="p-2 rounded-lg bg-[hsl(187,85%,43%)] text-white">
      {icon}
    </div>
    <div>
      <h4 className="font-semibold text-[hsl(195,50%,25%)]">{title}</h4>
      <p className="text-sm text-[hsl(195,50%,45%)]">{description}</p>
    </div>
  </div>
);

export default ProjectPresentation;
