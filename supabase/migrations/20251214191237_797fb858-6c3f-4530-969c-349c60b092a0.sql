-- Create table to track which users can refresh which dashboards
CREATE TABLE public.user_dashboard_refresh_permissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    dashboard_id UUID NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
    granted_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, dashboard_id)
);

-- Enable RLS
ALTER TABLE public.user_dashboard_refresh_permissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own refresh permissions
CREATE POLICY "Users can view their own refresh permissions"
ON public.user_dashboard_refresh_permissions
FOR SELECT
USING ((auth.uid())::text = user_id);

-- Admins can manage refresh permissions for their company's dashboards
CREATE POLICY "Admins can manage refresh permissions"
ON public.user_dashboard_refresh_permissions
FOR ALL
USING (
    has_role(auth.uid(), 'admin'::app_role) 
    AND dashboard_id IN (
        SELECT d.id FROM dashboards d
        WHERE d.company_id IN (
            SELECT p.company_id FROM profiles p WHERE p.id = (auth.uid())::text
        )
    )
);

-- Add dataset_id column to dashboards table for refresh functionality
ALTER TABLE public.dashboards ADD COLUMN IF NOT EXISTS dataset_id TEXT;