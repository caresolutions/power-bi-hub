-- Create user_dashboard_favorites table
CREATE TABLE IF NOT EXISTS public.user_dashboard_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  dashboard_id UUID NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, dashboard_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_dashboard_favorites ENABLE ROW LEVEL SECURITY;

-- Create policies for user favorites
CREATE POLICY "Users can view their own favorites" 
ON public.user_dashboard_favorites 
FOR SELECT 
USING ((auth.uid())::text = user_id);

CREATE POLICY "Users can insert their own favorites" 
ON public.user_dashboard_favorites 
FOR INSERT 
WITH CHECK ((auth.uid())::text = user_id);

CREATE POLICY "Users can delete their own favorites" 
ON public.user_dashboard_favorites 
FOR DELETE 
USING ((auth.uid())::text = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_dashboard_favorites_user_id ON public.user_dashboard_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_dashboard_favorites_dashboard_id ON public.user_dashboard_favorites(dashboard_id);