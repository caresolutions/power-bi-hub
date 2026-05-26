CREATE POLICY "Master admins can manage all refresh permissions"
ON public.user_dashboard_refresh_permissions
FOR ALL
USING (public.is_master_admin(auth.uid()))
WITH CHECK (public.is_master_admin(auth.uid()));