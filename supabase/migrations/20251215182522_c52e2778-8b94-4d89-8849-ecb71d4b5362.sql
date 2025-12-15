-- Create function to update timestamps if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create user bookmarks table for saved report states
CREATE TABLE public.user_dashboard_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  dashboard_id UUID NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bookmark_state JSONB NOT NULL,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_dashboard_bookmarks ENABLE ROW LEVEL SECURITY;

-- Users can view their own bookmarks
CREATE POLICY "Users can view their own bookmarks"
ON public.user_dashboard_bookmarks
FOR SELECT
USING ((auth.uid())::text = user_id);

-- Users can view shared bookmarks from same company
CREATE POLICY "Users can view shared company bookmarks"
ON public.user_dashboard_bookmarks
FOR SELECT
USING (
  is_shared = true AND 
  dashboard_id IN (
    SELECT d.id FROM dashboards d
    JOIN profiles p ON p.company_id = d.company_id
    WHERE p.id = (auth.uid())::text
  )
);

-- Users can insert their own bookmarks
CREATE POLICY "Users can insert their own bookmarks"
ON public.user_dashboard_bookmarks
FOR INSERT
WITH CHECK ((auth.uid())::text = user_id);

-- Users can update their own bookmarks
CREATE POLICY "Users can update their own bookmarks"
ON public.user_dashboard_bookmarks
FOR UPDATE
USING ((auth.uid())::text = user_id);

-- Users can delete their own bookmarks
CREATE POLICY "Users can delete their own bookmarks"
ON public.user_dashboard_bookmarks
FOR DELETE
USING ((auth.uid())::text = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_dashboard_bookmarks_updated_at
BEFORE UPDATE ON public.user_dashboard_bookmarks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_user_dashboard_bookmarks_user ON public.user_dashboard_bookmarks(user_id);