-- Drop existing insert policy
DROP POLICY IF EXISTS "Admins and master admins can insert roles" ON public.user_roles;

-- Create new insert policy with explicit master_admin check first
CREATE POLICY "Admins and master admins can insert roles" 
ON public.user_roles 
FOR INSERT 
TO authenticated
WITH CHECK (
  is_master_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)
);