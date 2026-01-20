import React from "react";
import { motion } from "framer-motion";
import { 
  Server, Users, CreditCard, Rocket, LayoutDashboard, Mail, 
  Shield, MessageSquare, Settings, Database, Lock, Building2,
  UserCheck, Crown, User, ChevronRight, Layers, Zap, Globe,
  BarChart3, FileText, Clock, RefreshCw, Bot, Bookmark,
  Star, Play, Download, Calendar, Bell, Palette, Key, FileEdit,
  GitBranch, Table, FolderTree, Workflow
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

        {/* Architecture & Technical Structure - Unified Section */}
        <motion.section {...fadeIn} className="space-y-8">
          <SectionHeader 
            icon={<Layers className="w-6 h-6" />} 
            title="1. Arquitetura e Stack Tecnológico" 
            subtitle="Visão geral da plataforma, componentes e integrações"
          />
          
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-[hsl(187,85%,90%)]">
            {/* Tech Stack Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Frontend */}
              <div className="p-6 bg-gradient-to-br from-[hsl(187,85%,97%)] to-white rounded-xl border border-[hsl(187,85%,90%)]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-[hsl(187,85%,43%)] rounded-lg">
                    <Globe className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-lg text-[hsl(195,50%,25%)]">Frontend</h3>
                </div>
                <div className="space-y-2">
                  <TechItem label="Framework" value="React 18 + Vite" />
                  <TechItem label="Linguagem" value="TypeScript" />
                  <TechItem label="Estilos" value="Tailwind CSS" />
                  <TechItem label="Componentes" value="shadcn/ui" />
                  <TechItem label="Animações" value="Framer Motion" />
                </div>
              </div>
              
              {/* Backend */}
              <div className="p-6 bg-gradient-to-br from-[hsl(195,80%,97%)] to-white rounded-xl border border-[hsl(195,80%,90%)]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-[hsl(195,80%,35%)] rounded-lg">
                    <Server className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-lg text-[hsl(195,50%,25%)]">Backend</h3>
                </div>
                <div className="space-y-2">
                  <TechItem label="Plataforma" value="Supabase" />
                  <TechItem label="Banco de Dados" value="PostgreSQL" />
                  <TechItem label="Funções" value="Edge Functions (Deno)" />
                  <TechItem label="Auth" value="Supabase Auth" />
                  <TechItem label="Segurança" value="Row Level Security" />
                </div>
              </div>
              
              {/* Integrations */}
              <div className="p-6 bg-gradient-to-br from-[hsl(200,90%,97%)] to-white rounded-xl border border-[hsl(200,90%,90%)]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-[hsl(200,90%,40%)] rounded-lg">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-lg text-[hsl(195,50%,25%)]">Integrações</h3>
                </div>
                <div className="space-y-2">
                  <TechItem label="BI" value="Power BI Embed API" />
                  <TechItem label="Pagamentos" value="Stripe" />
                  <TechItem label="WhatsApp" value="Z-API" />
                  <TechItem label="Email" value="Mailjet" />
                  <TechItem label="Realtime" value="Supabase Realtime" />
                </div>
              </div>
            </div>
            
            {/* Flow Diagram */}
            <div className="mt-8 p-6 bg-gradient-to-r from-[hsl(187,85%,97%)] to-[hsl(195,80%,97%)] rounded-xl">
              <h4 className="text-sm font-semibold text-[hsl(195,50%,40%)] mb-4 text-center">Fluxo Principal de Requisições</h4>
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

        {/* Technical Schema */}
        <motion.section {...fadeIn} className="space-y-8">
          <SectionHeader 
            icon={<GitBranch className="w-6 h-6" />} 
            title="Schema de Estrutura Técnica" 
            subtitle="Diagrama detalhado da arquitetura e banco de dados"
          />
          
          <Tabs defaultValue="database" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-[hsl(187,85%,95%)]">
              <TabsTrigger value="database" className="data-[state=active]:bg-[hsl(187,85%,43%)] data-[state=active]:text-white">
                <Table className="w-4 h-4 mr-2" />
                Banco de Dados
              </TabsTrigger>
              <TabsTrigger value="components" className="data-[state=active]:bg-[hsl(187,85%,43%)] data-[state=active]:text-white">
                <FolderTree className="w-4 h-4 mr-2" />
                Componentes
              </TabsTrigger>
              <TabsTrigger value="flows" className="data-[state=active]:bg-[hsl(187,85%,43%)] data-[state=active]:text-white">
                <Workflow className="w-4 h-4 mr-2" />
                Fluxos
              </TabsTrigger>
            </TabsList>
            
            {/* Database Schema Tab */}
            <TabsContent value="database" className="mt-6">
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-[hsl(187,85%,90%)] space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Core Tables */}
                  <SchemaGroup 
                    title="Tabelas Core" 
                    icon={<Database className="w-5 h-5" />}
                    tables={[
                      { name: "profiles", description: "Perfis de usuários", columns: ["id", "email", "full_name", "company_id", "is_active"] },
                      { name: "companies", description: "Empresas (tenants)", columns: ["id", "name", "cnpj", "logo_url", "colors..."] },
                      { name: "user_roles", description: "Papéis dos usuários", columns: ["user_id", "role (admin/user/master_admin)"] },
                    ]}
                  />
                  
                  {/* Dashboard Tables */}
                  <SchemaGroup 
                    title="Dashboards" 
                    icon={<LayoutDashboard className="w-5 h-5" />}
                    tables={[
                      { name: "dashboards", description: "Dashboards Power BI", columns: ["id", "name", "workspace_id", "dashboard_id", "company_id"] },
                      { name: "power_bi_configs", description: "Credenciais Power BI", columns: ["id", "name", "tenant_id", "client_id", "client_secret"] },
                      { name: "user_dashboard_access", description: "Acesso por usuário", columns: ["user_id", "dashboard_id", "granted_by"] },
                      { name: "group_dashboard_access", description: "Acesso por grupo", columns: ["group_id", "dashboard_id", "granted_by"] },
                    ]}
                  />
                  
                  {/* Subscription Tables */}
                  <SchemaGroup 
                    title="Assinaturas" 
                    icon={<CreditCard className="w-5 h-5" />}
                    tables={[
                      { name: "subscriptions", description: "Assinaturas de usuários", columns: ["user_id", "plan", "status", "stripe_subscription_id"] },
                      { name: "subscription_plans", description: "Planos disponíveis", columns: ["id", "name", "plan_key", "price_monthly", "stripe_price_id"] },
                      { name: "plan_limits", description: "Limites por plano", columns: ["plan_id", "limit_key", "limit_value", "is_unlimited"] },
                      { name: "plan_features", description: "Features por plano", columns: ["plan_id", "feature_key", "is_enabled"] },
                    ]}
                  />
                  
                  {/* Report Subscription Tables */}
                  <SchemaGroup 
                    title="Envio de Relatórios" 
                    icon={<Mail className="w-5 h-5" />}
                    tables={[
                      { name: "report_subscriptions", description: "Assinaturas de envio", columns: ["dashboard_id", "frequency", "schedule_time", "export_format"] },
                      { name: "subscription_recipients", description: "Destinatários", columns: ["subscription_id", "email", "apply_rls", "rls_user_id"] },
                      { name: "subscription_logs", description: "Logs de envio", columns: ["subscription_id", "status", "recipients_count"] },
                    ]}
                  />
                  
                  {/* User Management Tables */}
                  <SchemaGroup 
                    title="Gestão de Usuários" 
                    icon={<Users className="w-5 h-5" />}
                    tables={[
                      { name: "user_groups", description: "Grupos de usuários", columns: ["id", "name", "company_id", "description"] },
                      { name: "user_group_members", description: "Membros dos grupos", columns: ["group_id", "user_id", "added_by"] },
                      { name: "user_invitations", description: "Convites pendentes", columns: ["email", "invited_role", "company_id", "token", "expires_at"] },
                    ]}
                  />
                  
                  {/* Auxiliary Tables */}
                  <SchemaGroup 
                    title="Auxiliares" 
                    icon={<Layers className="w-5 h-5" />}
                    tables={[
                      { name: "dashboard_access_logs", description: "Logs de acesso", columns: ["user_id", "dashboard_id", "accessed_at", "report_page"] },
                      { name: "dashboard_page_visibility", description: "Visibilidade de páginas", columns: ["dashboard_id", "page_name", "is_visible"] },
                      { name: "user_dashboard_bookmarks", description: "Bookmarks salvos", columns: ["user_id", "dashboard_id", "name", "bookmark_state"] },
                      { name: "slider_slides", description: "Slides do modo slider", columns: ["dashboard_id", "slide_order", "duration_seconds"] },
                    ]}
                  />
                </div>
                
                {/* Relationships Diagram */}
                <div className="mt-8 p-6 bg-gradient-to-r from-[hsl(187,85%,97%)] to-[hsl(195,80%,97%)] rounded-xl">
                  <h4 className="font-semibold text-[hsl(195,50%,25%)] mb-4 flex items-center gap-2">
                    <GitBranch className="w-5 h-5 text-[hsl(187,85%,43%)]" />
                    Relacionamentos Principais
                  </h4>
                  <div className="flex flex-wrap gap-4 justify-center">
                    <RelationshipBadge from="profiles" to="companies" type="N:1" />
                    <RelationshipBadge from="dashboards" to="companies" type="N:1" />
                    <RelationshipBadge from="dashboards" to="power_bi_configs" type="N:1" />
                    <RelationshipBadge from="user_dashboard_access" to="dashboards" type="N:1" />
                    <RelationshipBadge from="subscriptions" to="subscription_plans" type="N:1" />
                    <RelationshipBadge from="report_subscriptions" to="dashboards" type="N:1" />
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* Components Tab */}
            <TabsContent value="components" className="mt-6">
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-[hsl(187,85%,90%)]">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Pages */}
                  <ComponentGroup 
                    title="Páginas (pages/)"
                    items={[
                      "Index.tsx - Landing page",
                      "Auth.tsx - Login/Registro",
                      "Home.tsx - Dashboard home",
                      "Dashboards.tsx - Catálogo",
                      "DashboardViewer.tsx - Visualização",
                      "Settings.tsx - Configurações",
                      "Users.tsx - Gestão usuários",
                      "UserGroups.tsx - Grupos",
                      "Credentials.tsx - Power BI",
                      "ReportSubscriptions.tsx - Envios",
                      "MasterAdmin.tsx - Admin global",
                    ]}
                  />
                  
                  {/* Components */}
                  <ComponentGroup 
                    title="Componentes Principais"
                    items={[
                      "auth/ - Autenticação",
                      "dashboards/ - Visualização BI",
                      "settings/ - Configurações",
                      "users/ - Gestão usuários",
                      "subscription/ - Planos",
                      "onboarding/ - Onboarding",
                      "master-admin/ - Admin",
                      "support/ - Chat suporte",
                      "ui/ - Componentes base",
                    ]}
                  />
                  
                  {/* Edge Functions */}
                  <ComponentGroup 
                    title="Edge Functions"
                    items={[
                      "get-powerbi-embed - Token embed",
                      "refresh-dataset - Atualiza dados",
                      "export-report - Exporta PDF/PPTX",
                      "query-dataset-chat - Chat IA",
                      "create-checkout - Stripe checkout",
                      "stripe-webhook - Webhooks",
                      "send-email - Envio emails",
                      "zapi-webhook - WhatsApp",
                      "process-subscriptions - Envios",
                    ]}
                  />
                </div>
                
                {/* Hooks and Contexts */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ComponentGroup 
                    title="Hooks Customizados (hooks/)"
                    items={[
                      "useUserRole - Papel do usuário",
                      "useSubscriptionStatus - Status assinatura",
                      "useSubscriptionPlan - Limites do plano",
                      "useDashboardFavorites - Favoritos",
                      "useDashboardBookmarks - Bookmarks",
                      "useCompanyCustomization - Tema empresa",
                      "useOnboardingProgress - Progresso",
                      "useAccessLog - Logs de acesso",
                    ]}
                  />
                  
                  <ComponentGroup 
                    title="Contextos (contexts/)"
                    items={[
                      "AuthContext - Estado de autenticação",
                      "ConsentProvider - Consentimento LGPD",
                    ]}
                  />
                </div>
              </div>
            </TabsContent>
            
            {/* Flows Tab */}
            <TabsContent value="flows" className="mt-6">
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-[hsl(187,85%,90%)] space-y-8">
                {/* Auth Flow */}
                <FlowDiagram 
                  title="Fluxo de Autenticação"
                  steps={[
                    { icon: <User />, label: "Usuário acessa" },
                    { icon: <Lock />, label: "Supabase Auth" },
                    { icon: <Database />, label: "Busca profile" },
                    { icon: <Shield />, label: "Verifica role" },
                    { icon: <LayoutDashboard />, label: "Redireciona" },
                  ]}
                />
                
                {/* Dashboard View Flow */}
                <FlowDiagram 
                  title="Fluxo de Visualização de Dashboard"
                  steps={[
                    { icon: <User />, label: "Usuário seleciona" },
                    { icon: <Shield />, label: "Verifica acesso" },
                    { icon: <Key />, label: "Busca credencial" },
                    { icon: <Server />, label: "Edge Function" },
                    { icon: <Zap />, label: "Token embed" },
                    { icon: <BarChart3 />, label: "Renderiza BI" },
                  ]}
                />
                
                {/* Subscription Flow */}
                <FlowDiagram 
                  title="Fluxo de Assinatura"
                  steps={[
                    { icon: <User />, label: "Escolhe plano" },
                    { icon: <CreditCard />, label: "Stripe Checkout" },
                    { icon: <Zap />, label: "Webhook" },
                    { icon: <Database />, label: "Atualiza DB" },
                    { icon: <Shield />, label: "Libera acesso" },
                  ]}
                />
                
                {/* Report Export Flow */}
                <FlowDiagram 
                  title="Fluxo de Envio de Relatório"
                  steps={[
                    { icon: <Clock />, label: "Cron trigger" },
                    { icon: <Database />, label: "Busca assinaturas" },
                    { icon: <Download />, label: "Exporta report" },
                    { icon: <Shield />, label: "Aplica RLS" },
                    { icon: <Mail />, label: "Envia email" },
                  ]}
                />
              </div>
            </TabsContent>
          </Tabs>
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
              features={["1 dashboard", "2 usuários", "Embed e Link Público"]}
              color="hsl(195,80%,50%)"
            />
            <PlanCard 
              name="Growth"
              price="R$ 249"
              features={["5 dashboards", "10 usuários", "Chat IA", "Slider TV"]}
              color="hsl(187,85%,43%)"
              highlighted
            />
            <PlanCard 
              name="Scale"
              price="R$ 499"
              features={["15 dashboards", "25 usuários", "Chat IA", "Slider TV", "RLS por email"]}
              color="hsl(195,80%,35%)"
            />
            <PlanCard 
              name="Enterprise"
              price="Customizado"
              features={["Ilimitado", "Chat IA", "Slider TV", "RLS por email", "SLA de suporte"]}
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

const TechItem = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-center text-sm py-1">
    <span className="text-[hsl(195,50%,45%)]">{label}</span>
    <span className="font-medium text-[hsl(195,50%,25%)]">{value}</span>
  </div>
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

// New Schema Components
const SchemaGroup = ({ title, icon, tables }: { 
  title: string; 
  icon: React.ReactNode; 
  tables: { name: string; description: string; columns: string[] }[] 
}) => (
  <div className="p-5 rounded-xl border border-[hsl(187,85%,85%)] bg-gradient-to-br from-white to-[hsl(187,85%,98%)]">
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[hsl(187,85%,90%)]">
      <span className="text-[hsl(187,85%,43%)]">{icon}</span>
      <h4 className="font-semibold text-[hsl(195,50%,25%)]">{title}</h4>
    </div>
    <div className="space-y-3">
      {tables.map((table, index) => (
        <div key={index} className="text-sm">
          <div className="flex items-center gap-2">
            <code className="px-2 py-0.5 bg-[hsl(187,85%,43%)] text-white rounded text-xs font-mono">
              {table.name}
            </code>
            <span className="text-[hsl(195,50%,45%)] text-xs">{table.description}</span>
          </div>
          <div className="mt-1 pl-4 text-xs text-[hsl(195,50%,55%)] font-mono">
            {table.columns.join(" · ")}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const RelationshipBadge = ({ from, to, type }: { from: string; to: string; type: string }) => (
  <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm border border-[hsl(187,85%,85%)]">
    <code className="text-xs font-mono text-[hsl(187,85%,35%)]">{from}</code>
    <span className="text-[hsl(187,85%,50%)]">→</span>
    <code className="text-xs font-mono text-[hsl(195,80%,35%)]">{to}</code>
    <Badge variant="outline" className="text-xs border-[hsl(187,85%,70%)] text-[hsl(195,50%,40%)]">
      {type}
    </Badge>
  </div>
);

const ComponentGroup = ({ title, items }: { title: string; items: string[] }) => (
  <div className="p-5 rounded-xl border border-[hsl(187,85%,85%)] bg-gradient-to-br from-white to-[hsl(187,85%,98%)]">
    <h4 className="font-semibold text-[hsl(195,50%,25%)] mb-3 pb-2 border-b border-[hsl(187,85%,90%)]">
      {title}
    </h4>
    <ul className="space-y-1.5">
      {items.map((item, index) => (
        <li key={index} className="text-sm text-[hsl(195,50%,35%)] flex items-start gap-2">
          <ChevronRight className="w-4 h-4 text-[hsl(187,85%,50%)] flex-shrink-0 mt-0.5" />
          <span className="font-mono text-xs">{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

const FlowDiagram = ({ title, steps }: { 
  title: string; 
  steps: { icon: React.ReactNode; label: string }[] 
}) => (
  <div className="p-5 rounded-xl border border-[hsl(187,85%,85%)] bg-gradient-to-r from-[hsl(187,85%,97%)] to-[hsl(195,80%,97%)]">
    <h4 className="font-semibold text-[hsl(195,50%,25%)] mb-4">{title}</h4>
    <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4">
      {steps.map((step, index) => (
        <React.Fragment key={index}>
          <div className="flex flex-col items-center gap-1 px-3 py-2 bg-white rounded-lg shadow-sm border border-[hsl(187,85%,85%)]">
            <span className="text-[hsl(187,85%,43%)]">{step.icon}</span>
            <span className="text-xs text-[hsl(195,50%,35%)] font-medium text-center">{step.label}</span>
          </div>
          {index < steps.length - 1 && (
            <ChevronRight className="w-5 h-5 text-[hsl(187,85%,50%)] hidden md:block" />
          )}
        </React.Fragment>
      ))}
    </div>
  </div>
);

export default ProjectPresentation;
