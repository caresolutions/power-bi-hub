-- Create subscription_plans table for dynamic plan configuration
CREATE TABLE public.subscription_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_key text NOT NULL UNIQUE,
    name text NOT NULL,
    price_monthly numeric(10,2) NOT NULL DEFAULT 0,
    price_additional_user numeric(10,2) DEFAULT NULL,
    trial_days integer NOT NULL DEFAULT 7,
    is_active boolean NOT NULL DEFAULT true,
    is_custom boolean NOT NULL DEFAULT false,
    display_order integer NOT NULL DEFAULT 0,
    description text,
    stripe_price_id text,
    stripe_product_id text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create plan_limits table for configurable limits per plan
CREATE TABLE public.plan_limits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
    limit_key text NOT NULL,
    limit_value integer,
    is_unlimited boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(plan_id, limit_key)
);

-- Create plan_features table for features per plan
CREATE TABLE public.plan_features (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
    feature_key text NOT NULL,
    is_enabled boolean NOT NULL DEFAULT false,
    feature_description text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(plan_id, feature_key)
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans
CREATE POLICY "Anyone can view active plans" 
ON public.subscription_plans 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Master admins can manage all plans" 
ON public.subscription_plans 
FOR ALL 
USING (is_master_admin(auth.uid()));

-- RLS Policies for plan_limits
CREATE POLICY "Anyone can view plan limits" 
ON public.plan_limits 
FOR SELECT 
USING (true);

CREATE POLICY "Master admins can manage plan limits" 
ON public.plan_limits 
FOR ALL 
USING (is_master_admin(auth.uid()));

-- RLS Policies for plan_features
CREATE POLICY "Anyone can view plan features" 
ON public.plan_features 
FOR SELECT 
USING (true);

CREATE POLICY "Master admins can manage plan features" 
ON public.plan_features 
FOR ALL 
USING (is_master_admin(auth.uid()));

-- Update triggers
CREATE TRIGGER update_subscription_plans_updated_at
    BEFORE UPDATE ON public.subscription_plans
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_plan_limits_updated_at
    BEFORE UPDATE ON public.plan_limits
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default plans based on the image
INSERT INTO public.subscription_plans (plan_key, name, price_monthly, price_additional_user, trial_days, display_order, description) VALUES
('starter', 'Starter', 59.00, 30.00, 7, 1, 'Ideal para quem está começando a explorar análises e dashboards.'),
('growth', 'Growth', 149.00, 25.00, 7, 2, 'Perfeito para empresas em expansão que precisam de mais recursos e colaboração.'),
('scale', 'Scale', 249.00, 20.00, 7, 3, 'Para organizações que precisam de flexibilidade e recursos avançados, incluindo RLS.'),
('enterprise', 'Enterprise', 0, NULL, 0, 4, 'Sob medida para grandes empresas com necessidades específicas e volumes acima dos limites do plano Scale.');

-- Set enterprise as custom
UPDATE public.subscription_plans SET is_custom = true WHERE plan_key = 'enterprise';

-- Insert plan limits
INSERT INTO public.plan_limits (plan_id, limit_key, limit_value, is_unlimited)
SELECT id, 'dashboards', 5, false FROM public.subscription_plans WHERE plan_key = 'starter'
UNION ALL
SELECT id, 'users', 3, false FROM public.subscription_plans WHERE plan_key = 'starter'
UNION ALL
SELECT id, 'credentials', 1, false FROM public.subscription_plans WHERE plan_key = 'starter'
UNION ALL
SELECT id, 'dashboards', 15, false FROM public.subscription_plans WHERE plan_key = 'growth'
UNION ALL
SELECT id, 'users', 10, false FROM public.subscription_plans WHERE plan_key = 'growth'
UNION ALL
SELECT id, 'credentials', 2, false FROM public.subscription_plans WHERE plan_key = 'growth'
UNION ALL
SELECT id, 'dashboards', NULL, true FROM public.subscription_plans WHERE plan_key = 'scale'
UNION ALL
SELECT id, 'users', 15, false FROM public.subscription_plans WHERE plan_key = 'scale'
UNION ALL
SELECT id, 'credentials', 3, false FROM public.subscription_plans WHERE plan_key = 'scale'
UNION ALL
SELECT id, 'dashboards', NULL, true FROM public.subscription_plans WHERE plan_key = 'enterprise'
UNION ALL
SELECT id, 'users', NULL, true FROM public.subscription_plans WHERE plan_key = 'enterprise'
UNION ALL
SELECT id, 'credentials', NULL, true FROM public.subscription_plans WHERE plan_key = 'enterprise';

-- Insert plan features
INSERT INTO public.plan_features (plan_id, feature_key, is_enabled, feature_description)
SELECT id, 'embed_publish', true, 'Publicação Embed e Link Público' FROM public.subscription_plans WHERE plan_key = 'starter'
UNION ALL
SELECT id, 'user_group_access', true, 'Liberação de dashboards por usuário e grupo' FROM public.subscription_plans WHERE plan_key = 'starter'
UNION ALL
SELECT id, 'slider_tv', false, 'Slider para exibição em Televisores' FROM public.subscription_plans WHERE plan_key = 'starter'
UNION ALL
SELECT id, 'rls_email', false, 'Aplicação de RLS a nível de e-mail' FROM public.subscription_plans WHERE plan_key = 'starter'
UNION ALL
SELECT id, 'embed_publish', true, 'Publicação Embed e Link Público' FROM public.subscription_plans WHERE plan_key = 'growth'
UNION ALL
SELECT id, 'user_group_access', true, 'Liberação de dashboards por usuário e grupo' FROM public.subscription_plans WHERE plan_key = 'growth'
UNION ALL
SELECT id, 'slider_tv', true, 'Slider para exibição em Televisores' FROM public.subscription_plans WHERE plan_key = 'growth'
UNION ALL
SELECT id, 'rls_email', false, 'Aplicação de RLS a nível de e-mail' FROM public.subscription_plans WHERE plan_key = 'growth'
UNION ALL
SELECT id, 'embed_publish', true, 'Publicação Embed e Link Público' FROM public.subscription_plans WHERE plan_key = 'scale'
UNION ALL
SELECT id, 'user_group_access', true, 'Liberação de dashboards por usuário e grupo' FROM public.subscription_plans WHERE plan_key = 'scale'
UNION ALL
SELECT id, 'slider_tv', true, 'Slider para exibição em Televisores' FROM public.subscription_plans WHERE plan_key = 'scale'
UNION ALL
SELECT id, 'rls_email', true, 'Aplicação de RLS a nível de e-mail' FROM public.subscription_plans WHERE plan_key = 'scale'
UNION ALL
SELECT id, 'embed_publish', true, 'Publicação Embed e Link Público' FROM public.subscription_plans WHERE plan_key = 'enterprise'
UNION ALL
SELECT id, 'user_group_access', true, 'Liberação de dashboards por usuário e grupo' FROM public.subscription_plans WHERE plan_key = 'enterprise'
UNION ALL
SELECT id, 'slider_tv', true, 'Slider para exibição em Televisores' FROM public.subscription_plans WHERE plan_key = 'enterprise'
UNION ALL
SELECT id, 'rls_email', true, 'Aplicação de RLS a nível de e-mail' FROM public.subscription_plans WHERE plan_key = 'enterprise'
UNION ALL
SELECT id, 'advanced_integrations', true, 'Integrações exclusivas' FROM public.subscription_plans WHERE plan_key = 'enterprise'
UNION ALL
SELECT id, 'sla_support', true, 'SLA de suporte' FROM public.subscription_plans WHERE plan_key = 'enterprise'
UNION ALL
SELECT id, 'custom_development', true, 'Desenvolvimento de dashboards' FROM public.subscription_plans WHERE plan_key = 'enterprise';