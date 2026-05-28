
-- 1) companies: remove permissive SELECT and add SECURITY DEFINER CNPJ check
DROP POLICY IF EXISTS "Authenticated users can check CNPJ uniqueness" ON public.companies;

CREATE OR REPLACE FUNCTION public.check_cnpj_exists(_cnpj text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.companies WHERE cnpj = _cnpj)
$$;

REVOKE ALL ON FUNCTION public.check_cnpj_exists(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_cnpj_exists(text) TO authenticated;

-- 2) slider_slides: tighten SELECT to actually accessible dashboards
DROP POLICY IF EXISTS "Users can view slides of accessible dashboards" ON public.slider_slides;

CREATE POLICY "Users can view slides of accessible dashboards"
ON public.slider_slides
FOR SELECT
USING (
  dashboard_id IN (
    SELECT d.id FROM public.dashboards d
    WHERE
      public.is_master_admin(auth.uid())
      OR d.company_id IN (SELECT p.company_id FROM public.profiles p WHERE p.id = (auth.uid())::text)
      OR EXISTS (SELECT 1 FROM public.user_dashboard_access uda WHERE uda.dashboard_id = d.id AND uda.user_id = (auth.uid())::text)
      OR public.has_group_dashboard_access((auth.uid())::text, d.id)
  )
);

-- 3) user_dashboard_access: only company admins (or master) can grant access for their company's dashboards
DROP POLICY IF EXISTS "Users can grant access" ON public.user_dashboard_access;

CREATE POLICY "Admins can grant dashboard access"
ON public.user_dashboard_access
FOR INSERT
WITH CHECK (
  (auth.uid())::text = granted_by
  AND (
    public.is_master_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.dashboards d
      JOIN public.profiles p ON p.company_id = d.company_id
      WHERE d.id = user_dashboard_access.dashboard_id
        AND p.id = (auth.uid())::text
        AND public.has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- 4) storage company-logos: restrict update/delete to the owning company admin
DROP POLICY IF EXISTS "Users can update company logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete company logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload company logos" ON storage.objects;

CREATE POLICY "Company admins can upload their logo"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos'
  AND auth.role() = 'authenticated'
  AND (
    public.is_master_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (auth.uid())::text
        AND public.has_role(auth.uid(), 'admin'::app_role)
        AND split_part(storage.objects.name, '-logo.', 1) = p.company_id::text
    )
  )
);

CREATE POLICY "Company admins can update their logo"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'company-logos'
  AND (
    public.is_master_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (auth.uid())::text
        AND public.has_role(auth.uid(), 'admin'::app_role)
        AND split_part(storage.objects.name, '-logo.', 1) = p.company_id::text
    )
  )
);

CREATE POLICY "Company admins can delete their logo"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'company-logos'
  AND (
    public.is_master_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (auth.uid())::text
        AND public.has_role(auth.uid(), 'admin'::app_role)
        AND split_part(storage.objects.name, '-logo.', 1) = p.company_id::text
    )
  )
);
