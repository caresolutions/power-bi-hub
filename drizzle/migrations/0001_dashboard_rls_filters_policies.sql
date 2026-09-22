CREATE POLICY "Users can view rls filters"
ON public.dashboard_rls_filters FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage company rls filters"
ON public.dashboard_rls_filters FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.dashboards d
    JOIN public.profiles p ON p.company_id = d.company_id
    WHERE d.id = public.dashboard_rls_filters.dashboard_id
      AND p.id = (auth.uid())::text
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.dashboards d
    JOIN public.profiles p ON p.company_id = d.company_id
    WHERE d.id = public.dashboard_rls_filters.dashboard_id
      AND p.id = (auth.uid())::text
  )
);

CREATE POLICY "Master admins can manage all rls filters"
ON public.dashboard_rls_filters FOR ALL TO authenticated
USING (public.is_master_admin(auth.uid()))
WITH CHECK (public.is_master_admin(auth.uid()));

CREATE POLICY "Users can view their own rls values"
ON public.dashboard_rls_user_values FOR SELECT TO authenticated
USING ((auth.uid())::text = user_id);

CREATE POLICY "Admins can manage company rls values"
ON public.dashboard_rls_user_values FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.dashboards d
    JOIN public.profiles p ON p.company_id = d.company_id
    WHERE d.id = public.dashboard_rls_user_values.dashboard_id
      AND p.id = (auth.uid())::text
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.dashboards d
    JOIN public.profiles p ON p.company_id = d.company_id
    WHERE d.id = public.dashboard_rls_user_values.dashboard_id
      AND p.id = (auth.uid())::text
  )
);

CREATE POLICY "Master admins can manage all rls values"
ON public.dashboard_rls_user_values FOR ALL TO authenticated
USING (public.is_master_admin(auth.uid()))
WITH CHECK (public.is_master_admin(auth.uid()));