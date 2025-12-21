-- Create table to store privacy consent records
CREATE TABLE public.privacy_consent_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_privacy_consent_user_id ON public.privacy_consent_records(user_id);
CREATE INDEX idx_privacy_consent_accepted_at ON public.privacy_consent_records(accepted_at);

-- Enable Row Level Security
ALTER TABLE public.privacy_consent_records ENABLE ROW LEVEL SECURITY;

-- Users can view their own consent records
CREATE POLICY "Users can view their own consent records"
ON public.privacy_consent_records
FOR SELECT
USING ((auth.uid())::text = user_id);

-- Users can insert their own consent records
CREATE POLICY "Users can insert their own consent"
ON public.privacy_consent_records
FOR INSERT
WITH CHECK ((auth.uid())::text = user_id);

-- Admins can view company consent records
CREATE POLICY "Admins can view company consent records"
ON public.privacy_consent_records
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) AND 
  user_id IN (
    SELECT p.id FROM profiles p 
    WHERE p.company_id IN (
      SELECT company_id FROM profiles WHERE id = (auth.uid())::text
    )
  )
);

-- Master admins can view all consent records
CREATE POLICY "Master admins can view all consent records"
ON public.privacy_consent_records
FOR SELECT
USING (is_master_admin(auth.uid()));