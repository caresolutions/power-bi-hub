-- Allow service role to insert/delete from dashboard_refresh_history (for cron job)
-- Note: The cron job uses service role key, so it bypasses RLS

-- Add DELETE policy for cleanup of old entries by admins
CREATE POLICY "Admins can delete refresh history for their dashboards" 
ON public.dashboard_refresh_history 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM dashboards d
    JOIN profiles p ON p.company_id = d.company_id
    WHERE d.id = dashboard_refresh_history.dashboard_id 
    AND p.id = auth.uid()::text 
    AND has_role(auth.uid(), 'admin'::app_role)
  )
);