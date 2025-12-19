-- Create user_groups table for sub-profiles
CREATE TABLE public.user_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(company_id, name)
);

-- Create user_group_members table (many-to-many)
CREATE TABLE public.user_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.user_groups(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    added_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(group_id, user_id)
);

-- Create group_dashboard_access table
CREATE TABLE public.group_dashboard_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.user_groups(id) ON DELETE CASCADE,
    dashboard_id UUID NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
    granted_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(group_id, dashboard_id)
);

-- Add is_master_managed to subscriptions for master admin managed companies
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS is_master_managed BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_dashboard_access ENABLE ROW LEVEL SECURITY;

-- Helper function to check master_admin role
CREATE OR REPLACE FUNCTION public.is_master_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'master_admin'
  )
$$;

-- Helper function to check group dashboard access
CREATE OR REPLACE FUNCTION public.has_group_dashboard_access(_user_id text, _dashboard_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_dashboard_access gda
    JOIN public.user_group_members ugm ON ugm.group_id = gda.group_id
    WHERE ugm.user_id = _user_id
      AND gda.dashboard_id = _dashboard_id
  )
$$;

-- Trigger for updated_at
CREATE TRIGGER update_user_groups_updated_at
BEFORE UPDATE ON public.user_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();