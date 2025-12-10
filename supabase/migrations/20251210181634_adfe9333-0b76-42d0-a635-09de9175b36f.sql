-- Create companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cnpj TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Add company_id to profiles
ALTER TABLE public.profiles ADD COLUMN company_id UUID REFERENCES public.companies(id);

-- Add company_id to dashboards
ALTER TABLE public.dashboards ADD COLUMN company_id UUID REFERENCES public.companies(id);

-- Add company_id to power_bi_configs
ALTER TABLE public.power_bi_configs ADD COLUMN company_id UUID REFERENCES public.companies(id);

-- Add company_id and role to user_invitations
ALTER TABLE public.user_invitations ADD COLUMN company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.user_invitations ADD COLUMN invited_role TEXT NOT NULL DEFAULT 'user';

-- Create trigger for companies updated_at
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- RLS Policies for companies
CREATE POLICY "Users can view their own company"
  ON public.companies FOR SELECT
  USING (id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()::text));

CREATE POLICY "Admins can update their own company"
  ON public.companies FOR UPDATE
  USING (id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()::text) AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can insert company during signup"
  ON public.companies FOR INSERT
  WITH CHECK (true);

-- Update dashboards RLS to include company filtering
DROP POLICY IF EXISTS "Users can view own dashboards or granted access" ON public.dashboards;
CREATE POLICY "Users can view company dashboards or granted access"
  ON public.dashboards FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()::text)
    OR EXISTS (
      SELECT 1 FROM user_dashboard_access 
      WHERE user_dashboard_access.dashboard_id = dashboards.id 
      AND user_dashboard_access.user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Users can insert own dashboards" ON public.dashboards;
CREATE POLICY "Admins can insert company dashboards"
  ON public.dashboards FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin') 
    AND company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()::text)
  );

DROP POLICY IF EXISTS "Users can update own dashboards" ON public.dashboards;
CREATE POLICY "Admins can update company dashboards"
  ON public.dashboards FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin')
    AND company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()::text)
  );

DROP POLICY IF EXISTS "Users can delete own dashboards" ON public.dashboards;
CREATE POLICY "Admins can delete company dashboards"
  ON public.dashboards FOR DELETE
  USING (
    has_role(auth.uid(), 'admin')
    AND company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()::text)
  );

-- Update power_bi_configs RLS
DROP POLICY IF EXISTS "Users can view own config" ON public.power_bi_configs;
CREATE POLICY "Users can view company config"
  ON public.power_bi_configs FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()::text));

DROP POLICY IF EXISTS "Users can insert own config" ON public.power_bi_configs;
CREATE POLICY "Admins can insert company config"
  ON public.power_bi_configs FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin')
    AND company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()::text)
  );

DROP POLICY IF EXISTS "Users can update own config" ON public.power_bi_configs;
CREATE POLICY "Admins can update company config"
  ON public.power_bi_configs FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin')
    AND company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()::text)
  );

DROP POLICY IF EXISTS "Users can delete own config" ON public.power_bi_configs;
CREATE POLICY "Admins can delete company config"
  ON public.power_bi_configs FOR DELETE
  USING (
    has_role(auth.uid(), 'admin')
    AND company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()::text)
  );

-- Update user_invitations RLS to filter by company
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.user_invitations;
CREATE POLICY "Admins can manage company invitations"
  ON public.user_invitations FOR ALL
  USING (
    has_role(auth.uid(), 'admin')
    AND company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()::text)
  );

-- Update handle_new_user_role function to handle company and role from invitation
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
        -- User was invited, assign role from invitation
        INSERT INTO public.user_roles (user_id, role) 
        VALUES (NEW.id, invitation_record.invited_role::app_role);
        
        -- Update profile with company_id from invitation
        UPDATE public.profiles 
        SET company_id = invitation_record.company_id 
        WHERE id = NEW.id::text;
        
        -- Mark invitation as accepted
        UPDATE public.user_invitations 
        SET accepted_at = now() 
        WHERE id = invitation_record.id;
        
        -- Grant access to dashboards from invitation
        INSERT INTO public.user_dashboard_access (dashboard_id, user_id, granted_by)
        SELECT unnest(invitation_record.dashboard_ids), NEW.id::text, invitation_record.invited_by::text;
    ELSE
        -- New signup without invitation = admin (will need to create company)
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
        
        -- Create trial subscription
        INSERT INTO public.subscriptions (user_id, status, plan) VALUES (NEW.id, 'trial', 'free');
    END IF;
    
    RETURN NEW;
END;
$function$;