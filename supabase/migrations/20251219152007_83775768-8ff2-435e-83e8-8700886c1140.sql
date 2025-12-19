-- Add policy for master admins to view ALL credentials (including global ones)
CREATE POLICY "Master admins can view all configs" 
ON public.power_bi_configs 
FOR SELECT 
USING (is_master_admin(auth.uid()));

-- Add policy for master admins to manage ALL credentials
CREATE POLICY "Master admins can manage all configs" 
ON public.power_bi_configs 
FOR ALL 
USING (is_master_admin(auth.uid()));