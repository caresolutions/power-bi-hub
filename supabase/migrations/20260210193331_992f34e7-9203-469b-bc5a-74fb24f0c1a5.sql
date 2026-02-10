
-- Create dashboard_app_items table
CREATE TABLE public.dashboard_app_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  app_dashboard_id UUID NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  child_dashboard_id UUID NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(app_dashboard_id, child_dashboard_id)
);

-- Enable RLS
ALTER TABLE public.dashboard_app_items ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read items for dashboards in their company
CREATE POLICY "Users can view app items for their company dashboards"
ON public.dashboard_app_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.dashboards d
    JOIN public.profiles p ON p.company_id = d.company_id
    WHERE d.id = app_dashboard_id
      AND p.id = auth.uid()::text
  )
  OR public.is_master_admin(auth.uid())
);

-- Policy: admins can insert items for their company dashboards
CREATE POLICY "Admins can insert app items"
ON public.dashboard_app_items
FOR INSERT
TO authenticated
WITH CHECK (
  (
    EXISTS (
      SELECT 1 FROM public.dashboards d
      JOIN public.profiles p ON p.company_id = d.company_id
      WHERE d.id = app_dashboard_id
        AND p.id = auth.uid()::text
    )
    AND public.has_role(auth.uid(), 'admin')
  )
  OR public.is_master_admin(auth.uid())
);

-- Policy: admins can update items for their company dashboards
CREATE POLICY "Admins can update app items"
ON public.dashboard_app_items
FOR UPDATE
TO authenticated
USING (
  (
    EXISTS (
      SELECT 1 FROM public.dashboards d
      JOIN public.profiles p ON p.company_id = d.company_id
      WHERE d.id = app_dashboard_id
        AND p.id = auth.uid()::text
    )
    AND public.has_role(auth.uid(), 'admin')
  )
  OR public.is_master_admin(auth.uid())
);

-- Policy: admins can delete items for their company dashboards
CREATE POLICY "Admins can delete app items"
ON public.dashboard_app_items
FOR DELETE
TO authenticated
USING (
  (
    EXISTS (
      SELECT 1 FROM public.dashboards d
      JOIN public.profiles p ON p.company_id = d.company_id
      WHERE d.id = app_dashboard_id
        AND p.id = auth.uid()::text
    )
    AND public.has_role(auth.uid(), 'admin')
  )
  OR public.is_master_admin(auth.uid())
);

-- Add index for performance
CREATE INDEX idx_dashboard_app_items_app_id ON public.dashboard_app_items(app_dashboard_id);
CREATE INDEX idx_dashboard_app_items_child_id ON public.dashboard_app_items(child_dashboard_id);
