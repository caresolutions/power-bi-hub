-- Drop the table if it was partially created
DROP TABLE IF EXISTS public.dashboard_page_visibility;

-- Create table to store page visibility configurations per dashboard
CREATE TABLE public.dashboard_page_visibility (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dashboard_id UUID NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  page_name TEXT NOT NULL,
  page_display_name TEXT NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(dashboard_id, page_name)
);

-- Enable RLS
ALTER TABLE public.dashboard_page_visibility ENABLE ROW LEVEL SECURITY;

-- Master admins can do everything
CREATE POLICY "Master admins can manage page visibility"
ON public.dashboard_page_visibility
FOR ALL
USING (public.is_master_admin(auth.uid()));

-- Admins can manage visibility for dashboards in their company
CREATE POLICY "Admins can manage page visibility for company dashboards"
ON public.dashboard_page_visibility
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.dashboards d
    JOIN public.profiles p ON p.company_id = d.company_id
    WHERE d.id = dashboard_page_visibility.dashboard_id AND p.id = (auth.uid())::text
  )
);

-- Users can read visibility settings for dashboards they have access to
CREATE POLICY "Users can read page visibility"
ON public.dashboard_page_visibility
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_dashboard_access uda
    WHERE uda.dashboard_id = dashboard_page_visibility.dashboard_id 
    AND uda.user_id = (auth.uid())::text
  ) OR
  public.has_group_dashboard_access((auth.uid())::text, dashboard_page_visibility.dashboard_id)
);

-- Create index for faster lookups
CREATE INDEX idx_dashboard_page_visibility_dashboard ON public.dashboard_page_visibility(dashboard_id);

-- Add trigger for updated_at
CREATE TRIGGER update_dashboard_page_visibility_updated_at
BEFORE UPDATE ON public.dashboard_page_visibility
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();