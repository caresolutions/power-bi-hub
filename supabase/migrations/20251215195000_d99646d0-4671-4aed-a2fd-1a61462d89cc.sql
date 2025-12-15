-- Add missing catalog columns to dashboards table
ALTER TABLE public.dashboards 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS tags text[];