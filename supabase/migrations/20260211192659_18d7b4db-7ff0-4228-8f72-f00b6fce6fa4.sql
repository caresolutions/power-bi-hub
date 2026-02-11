CREATE POLICY "Master admins can manage all invitations"
ON public.user_invitations
FOR ALL
USING (is_master_admin(auth.uid()))
WITH CHECK (is_master_admin(auth.uid()));