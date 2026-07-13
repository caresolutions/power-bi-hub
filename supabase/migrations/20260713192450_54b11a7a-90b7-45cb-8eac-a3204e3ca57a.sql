-- 1. Add triggered_by to history
ALTER TABLE public.dashboard_refresh_history
  ADD COLUMN IF NOT EXISTS triggered_by text NOT NULL DEFAULT 'manual';

-- 2. New table: dashboard_refresh_schedules
CREATE TABLE public.dashboard_refresh_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id uuid NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by text NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  time_of_day time NOT NULL DEFAULT '06:00',
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  days_of_week int[] DEFAULT '{}',
  day_of_month int CHECK (day_of_month IS NULL OR (day_of_month BETWEEN 1 AND 28)),
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_schedules_dashboard ON public.dashboard_refresh_schedules(dashboard_id);
CREATE INDEX idx_refresh_schedules_next_run ON public.dashboard_refresh_schedules(next_run_at) WHERE is_active = true;

-- 3. GRANTs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboard_refresh_schedules TO authenticated;
GRANT ALL ON public.dashboard_refresh_schedules TO service_role;

-- 4. RLS
ALTER TABLE public.dashboard_refresh_schedules ENABLE ROW LEVEL SECURITY;

-- Master admins: full access
CREATE POLICY "Master admins can manage all refresh schedules"
  ON public.dashboard_refresh_schedules
  FOR ALL
  TO authenticated
  USING (public.is_master_admin(auth.uid()))
  WITH CHECK (public.is_master_admin(auth.uid()));

-- Company admins: manage schedules for dashboards in their company
CREATE POLICY "Admins can view company refresh schedules"
  ON public.dashboard_refresh_schedules
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (auth.uid())::text
        AND p.company_id = dashboard_refresh_schedules.company_id
    )
  );

CREATE POLICY "Admins can insert company refresh schedules"
  ON public.dashboard_refresh_schedules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (auth.uid())::text
        AND p.company_id = dashboard_refresh_schedules.company_id
    )
  );

CREATE POLICY "Admins can update company refresh schedules"
  ON public.dashboard_refresh_schedules
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (auth.uid())::text
        AND p.company_id = dashboard_refresh_schedules.company_id
    )
  );

CREATE POLICY "Admins can delete company refresh schedules"
  ON public.dashboard_refresh_schedules
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (auth.uid())::text
        AND p.company_id = dashboard_refresh_schedules.company_id
    )
  );

-- 5. updated_at trigger
CREATE TRIGGER update_dashboard_refresh_schedules_updated_at
  BEFORE UPDATE ON public.dashboard_refresh_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();