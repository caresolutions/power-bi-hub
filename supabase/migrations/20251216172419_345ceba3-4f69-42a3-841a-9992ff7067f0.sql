-- Add extended color palette columns to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS accent_color TEXT,
ADD COLUMN IF NOT EXISTS background_color TEXT,
ADD COLUMN IF NOT EXISTS foreground_color TEXT,
ADD COLUMN IF NOT EXISTS muted_color TEXT,
ADD COLUMN IF NOT EXISTS destructive_color TEXT,
ADD COLUMN IF NOT EXISTS success_color TEXT,
ADD COLUMN IF NOT EXISTS card_color TEXT,
ADD COLUMN IF NOT EXISTS border_color TEXT;