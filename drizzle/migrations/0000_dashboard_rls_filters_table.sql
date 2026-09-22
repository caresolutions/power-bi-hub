CREATE TABLE public.dashboard_rls_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id uuid NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  table_name text NOT NULL,
  column_name text NOT NULL,
  use_email boolean NOT NULL DEFAULT true,
  exempt_admins boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dashboard_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboard_rls_filters TO authenticated;
GRANT ALL ON public.dashboard_rls_filters TO service_role;
ALTER TABLE public.dashboard_rls_filters ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.dashboard_rls_user_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id uuid NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  filter_value text NOT NULL,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dashboard_id, user_id, filter_value)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboard_rls_user_values TO authenticated;
GRANT ALL ON public.dashboard_rls_user_values TO service_role;
ALTER TABLE public.dashboard_rls_user_values ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_dashboard_rls_filters_updated_at
BEFORE UPDATE ON public.dashboard_rls_filters
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();