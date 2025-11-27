-- Create profiles table
CREATE TABLE public.profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid()::text = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid()::text = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid()::text = id);

-- Create Power BI configurations table
CREATE TABLE public.power_bi_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.power_bi_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own config"
  ON public.power_bi_configs FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own config"
  ON public.power_bi_configs FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own config"
  ON public.power_bi_configs FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Create dashboards table
CREATE TABLE public.dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  dashboard_id TEXT NOT NULL,
  report_section TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dashboards"
  ON public.dashboards FOR SELECT
  USING (auth.uid()::text = owner_id);

CREATE POLICY "Users can insert own dashboards"
  ON public.dashboards FOR INSERT
  WITH CHECK (auth.uid()::text = owner_id);

CREATE POLICY "Users can update own dashboards"
  ON public.dashboards FOR UPDATE
  USING (auth.uid()::text = owner_id);

CREATE POLICY "Users can delete own dashboards"
  ON public.dashboards FOR DELETE
  USING (auth.uid()::text = owner_id);

-- Create user dashboard access table
CREATE TABLE public.user_dashboard_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  granted_by TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(dashboard_id, user_id)
);

ALTER TABLE public.user_dashboard_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view access they granted"
  ON public.user_dashboard_access FOR SELECT
  USING (auth.uid()::text = granted_by);

CREATE POLICY "Users can view their own access"
  ON public.user_dashboard_access FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can grant access"
  ON public.user_dashboard_access FOR INSERT
  WITH CHECK (auth.uid()::text = granted_by);

CREATE POLICY "Users can revoke access they granted"
  ON public.user_dashboard_access FOR DELETE
  USING (auth.uid()::text = granted_by);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_power_bi_configs_updated_at
  BEFORE UPDATE ON public.power_bi_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_dashboards_updated_at
  BEFORE UPDATE ON public.dashboards
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup  
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();