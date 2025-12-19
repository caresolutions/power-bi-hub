-- Create table for slider slides
CREATE TABLE public.slider_slides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dashboard_id UUID NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  slide_name TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  report_id TEXT NOT NULL,
  report_section TEXT,
  credential_id UUID REFERENCES public.power_bi_configs(id),
  duration_seconds INTEGER NOT NULL DEFAULT 30,
  slide_order INTEGER NOT NULL DEFAULT 1,
  transition_type TEXT NOT NULL DEFAULT 'fade',
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.slider_slides ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view slides of accessible dashboards"
ON public.slider_slides
FOR SELECT
USING (
  dashboard_id IN (
    SELECT id FROM public.dashboards
  )
);

CREATE POLICY "Admins can manage slides for company dashboards"
ON public.slider_slides
FOR ALL
USING (
  dashboard_id IN (
    SELECT d.id FROM public.dashboards d
    JOIN profiles p ON p.company_id = d.company_id
    WHERE p.id = (auth.uid())::text
    AND has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Master admins can manage all slides"
ON public.slider_slides
FOR ALL
USING (is_master_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_slider_slides_updated_at
BEFORE UPDATE ON public.slider_slides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();