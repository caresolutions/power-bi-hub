-- Create table for dashboard access logs
CREATE TABLE public.dashboard_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id uuid NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  accessed_at timestamp with time zone NOT NULL DEFAULT now(),
  user_agent text,
  ip_address text
);

-- Create indexes for performance
CREATE INDEX idx_dashboard_access_logs_dashboard_id ON public.dashboard_access_logs(dashboard_id);
CREATE INDEX idx_dashboard_access_logs_user_id ON public.dashboard_access_logs(user_id);
CREATE INDEX idx_dashboard_access_logs_company_id ON public.dashboard_access_logs(company_id);
CREATE INDEX idx_dashboard_access_logs_accessed_at ON public.dashboard_access_logs(accessed_at DESC);

-- Enable RLS
ALTER TABLE public.dashboard_access_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Master admins can see all logs
CREATE POLICY "Master admins can view all access logs"
ON public.dashboard_access_logs
FOR SELECT
USING (is_master_admin(auth.uid()));

-- Policy: Admins can see their company's logs
CREATE POLICY "Admins can view company access logs"
ON public.dashboard_access_logs
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND company_id IN (
    SELECT p.company_id FROM profiles p WHERE p.id = (auth.uid())::text
  )
);

-- Policy: Anyone authenticated can insert their own logs
CREATE POLICY "Users can insert their own access logs"
ON public.dashboard_access_logs
FOR INSERT
WITH CHECK ((auth.uid())::text = user_id);

-- Create table for access log view permissions
CREATE TABLE public.access_log_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  granted_by text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- Enable RLS
ALTER TABLE public.access_log_permissions ENABLE ROW LEVEL SECURITY;

-- Policy: Master admins can manage all permissions
CREATE POLICY "Master admins can manage all access log permissions"
ON public.access_log_permissions
FOR ALL
USING (is_master_admin(auth.uid()));

-- Policy: Admins can manage their company's permissions
CREATE POLICY "Admins can manage company access log permissions"
ON public.access_log_permissions
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND company_id IN (
    SELECT p.company_id FROM profiles p WHERE p.id = (auth.uid())::text
  )
);

-- Policy: Users can view their own permissions
CREATE POLICY "Users can view their own access log permissions"
ON public.access_log_permissions
FOR SELECT
USING ((auth.uid())::text = user_id);

-- Policy: Users with permission can view company logs
CREATE POLICY "Users with permission can view company access logs"
ON public.dashboard_access_logs
FOR SELECT
USING (
  company_id IN (
    SELECT alp.company_id 
    FROM access_log_permissions alp 
    WHERE alp.user_id = (auth.uid())::text
  )
);