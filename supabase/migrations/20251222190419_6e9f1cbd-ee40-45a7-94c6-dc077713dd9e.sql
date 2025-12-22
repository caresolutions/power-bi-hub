-- Add SELECT policy for master admins to view all roles
CREATE POLICY "Master admins can view all roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (is_master_admin(auth.uid()));