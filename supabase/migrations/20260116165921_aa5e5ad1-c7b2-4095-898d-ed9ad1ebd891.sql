-- Add policy for master admins to view all subscriptions
CREATE POLICY "Master admins can view all subscriptions" 
ON public.subscriptions 
FOR SELECT 
USING (is_master_admin(auth.uid()));

-- Add policy for master admins to manage all subscriptions
CREATE POLICY "Master admins can manage all subscriptions" 
ON public.subscriptions 
FOR ALL 
USING (is_master_admin(auth.uid()));