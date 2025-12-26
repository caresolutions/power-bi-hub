-- Add font and style customization fields to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS font_primary TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS font_secondary TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS border_radius TEXT DEFAULT 'md';