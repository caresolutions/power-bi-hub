
-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view own dashboards" ON public.dashboards;

-- Create new policy that allows owners OR users with granted access
CREATE POLICY "Users can view own dashboards or granted access" 
ON public.dashboards 
FOR SELECT 
USING (
  (auth.uid())::text = owner_id 
  OR 
  EXISTS (
    SELECT 1 FROM public.user_dashboard_access 
    WHERE user_dashboard_access.dashboard_id = dashboards.id 
    AND user_dashboard_access.user_id = (auth.uid())::text
  )
);
