-- Add embed_type and public_link columns to dashboards table
ALTER TABLE public.dashboards 
ADD COLUMN embed_type text NOT NULL DEFAULT 'workspace_id',
ADD COLUMN public_link text;

-- Add constraint to validate embed_type values
ALTER TABLE public.dashboards 
ADD CONSTRAINT dashboards_embed_type_check 
CHECK (embed_type IN ('workspace_id', 'public_link'));