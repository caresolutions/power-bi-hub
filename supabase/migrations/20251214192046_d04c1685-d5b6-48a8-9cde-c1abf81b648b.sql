-- Create table to store dashboard refresh history
CREATE TABLE public.dashboard_refresh_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dashboard_id UUID NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dashboard_refresh_history ENABLE ROW LEVEL SECURITY;

-- Users with refresh permission can view history for dashboards they can refresh
CREATE POLICY "Users can view refresh history for permitted dashboards"
ON public.dashboard_refresh_history
FOR SELECT
USING (
  dashboard_id IN (
    SELECT dashboard_id FROM public.user_dashboard_refresh_permissions
    WHERE user_id = (auth.uid())::text
  )
  OR
  EXISTS (
    SELECT 1 FROM public.dashboards d
    JOIN public.profiles p ON p.company_id = d.company_id
    WHERE d.id = dashboard_refresh_history.dashboard_id
    AND p.id = (auth.uid())::text
    AND has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Enable realtime for refresh history
ALTER PUBLICATION supabase_realtime ADD TABLE public.dashboard_refresh_history;