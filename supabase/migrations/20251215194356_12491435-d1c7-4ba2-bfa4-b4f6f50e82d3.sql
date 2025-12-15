-- Add dataset_schema column to dashboards table for manual schema configuration
ALTER TABLE public.dashboards 
ADD COLUMN IF NOT EXISTS dataset_schema text;

-- Add comment explaining the field
COMMENT ON COLUMN public.dashboards.dataset_schema IS 'Manual schema definition for AI chat. Format: TableName: Column1, Column2 | TableName2: Column1, Column2';