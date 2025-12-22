
-- Drop existing insert policy
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;

-- Create new policy that allows both admin and master_admin to insert
CREATE POLICY "Admins and master admins can insert roles" 
ON public.user_roles 
FOR INSERT 
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR is_master_admin(auth.uid())
);

-- Also update delete policy to allow master_admin
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Admins and master admins can delete roles" 
ON public.user_roles 
FOR DELETE 
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR is_master_admin(auth.uid())
);
