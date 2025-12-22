-- Add UPDATE policy for user_roles to allow upsert operations
CREATE POLICY "Admins and master admins can update roles" 
ON public.user_roles 
FOR UPDATE 
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR is_master_admin(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR is_master_admin(auth.uid())
);