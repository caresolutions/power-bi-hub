
-- Drop the overly permissive policy that lets any company user read credentials
DROP POLICY IF EXISTS "Users can view company config" ON public.power_bi_configs;

-- Create a new policy that restricts credential viewing to admins only
CREATE POLICY "Admins can view company config"
ON public.power_bi_configs
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) AND (
    company_id IN (
      SELECT profiles.company_id
      FROM profiles
      WHERE profiles.id = (auth.uid())::text
    )
  )
);
