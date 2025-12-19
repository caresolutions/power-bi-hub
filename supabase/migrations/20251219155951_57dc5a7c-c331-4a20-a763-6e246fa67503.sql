-- Remove a constraint existente e adiciona uma nova incluindo "slider"
ALTER TABLE public.dashboards DROP CONSTRAINT IF EXISTS dashboards_embed_type_check;

ALTER TABLE public.dashboards ADD CONSTRAINT dashboards_embed_type_check 
CHECK (embed_type IN ('workspace_id', 'public_link', 'slider'));