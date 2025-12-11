-- Add customization columns to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#0891b2',
ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT '#06b6d4';

-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their company logo
CREATE POLICY "Users can upload company logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos' 
  AND auth.role() = 'authenticated'
);

-- Allow public read access to company logos
CREATE POLICY "Company logos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'company-logos');

-- Allow users to update their own company logos
CREATE POLICY "Users can update company logos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'company-logos'
  AND auth.role() = 'authenticated'
);

-- Allow users to delete their own company logos
CREATE POLICY "Users can delete company logos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'company-logos'
  AND auth.role() = 'authenticated'
);