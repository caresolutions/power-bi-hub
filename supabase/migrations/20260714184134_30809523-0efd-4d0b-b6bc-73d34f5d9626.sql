CREATE TABLE public.edit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_name TEXT,
  action TEXT NOT NULL,
  user_id TEXT,
  user_email TEXT,
  company_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_edit_logs_company ON public.edit_logs(company_id, created_at DESC);
CREATE INDEX idx_edit_logs_entity ON public.edit_logs(entity_type, entity_id);

GRANT SELECT, INSERT ON public.edit_logs TO authenticated;
GRANT ALL ON public.edit_logs TO service_role;

ALTER TABLE public.edit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert logs"
  ON public.edit_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (auth.uid())::text);

CREATE POLICY "Master admins can view all logs"
  ON public.edit_logs FOR SELECT
  TO authenticated
  USING (public.is_master_admin(auth.uid()));

CREATE POLICY "Admins can view logs of their company"
  ON public.edit_logs FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND company_id = (
      SELECT p.company_id FROM public.profiles p WHERE p.id = (auth.uid())::text
    )
  );