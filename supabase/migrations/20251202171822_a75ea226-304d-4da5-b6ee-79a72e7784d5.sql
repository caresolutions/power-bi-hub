-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Add name field to power_bi_configs for multiple credentials
ALTER TABLE public.power_bi_configs 
ADD COLUMN name TEXT NOT NULL DEFAULT 'Default';

-- Remove the unique constraint on user_id to allow multiple configs
ALTER TABLE public.power_bi_configs 
DROP CONSTRAINT IF EXISTS power_bi_configs_user_id_key;

-- Add credential_id to dashboards to link with specific credential
ALTER TABLE public.dashboards
ADD COLUMN credential_id UUID REFERENCES public.power_bi_configs(id) ON DELETE SET NULL;

-- Create user_invitations table
CREATE TABLE public.user_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    dashboard_ids UUID[] NOT NULL DEFAULT '{}',
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_invitations
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_invitations
CREATE POLICY "Admins can manage invitations"
ON public.user_invitations
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own invitation by token"
ON public.user_invitations
FOR SELECT
USING (true);

-- Create subscriptions placeholder table
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'trial',
    plan TEXT NOT NULL DEFAULT 'free',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscriptions
CREATE POLICY "Users can view their own subscription"
ON public.subscriptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
ON public.subscriptions
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for auto-assigning admin role on first signup (subscription holder)
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    invitation_record RECORD;
BEGIN
    -- Check if user was invited
    SELECT * INTO invitation_record 
    FROM public.user_invitations 
    WHERE email = NEW.email 
    AND accepted_at IS NULL 
    AND expires_at > now()
    LIMIT 1;
    
    IF invitation_record.id IS NOT NULL THEN
        -- User was invited, assign 'user' role
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
        
        -- Mark invitation as accepted
        UPDATE public.user_invitations 
        SET accepted_at = now() 
        WHERE id = invitation_record.id;
        
        -- Grant access to dashboards from invitation
        INSERT INTO public.user_dashboard_access (dashboard_id, user_id, granted_by)
        SELECT unnest(invitation_record.dashboard_ids), NEW.id, invitation_record.invited_by;
    ELSE
        -- New signup without invitation = admin
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
        
        -- Create trial subscription
        INSERT INTO public.subscriptions (user_id, status, plan) VALUES (NEW.id, 'trial', 'free');
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for new user role assignment
CREATE TRIGGER on_auth_user_created_role
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();