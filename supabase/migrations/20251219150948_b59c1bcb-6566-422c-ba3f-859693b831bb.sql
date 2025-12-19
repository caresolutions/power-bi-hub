-- Create table to link global credentials to specific companies
CREATE TABLE public.credential_company_access (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    credential_id UUID NOT NULL REFERENCES public.power_bi_configs(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    granted_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(credential_id, company_id)
);

-- Enable RLS
ALTER TABLE public.credential_company_access ENABLE ROW LEVEL SECURITY;

-- Only master admins can manage credential access
CREATE POLICY "Master admins can manage credential access"
ON public.credential_company_access
FOR ALL
USING (is_master_admin(auth.uid()));

-- Users can view credential access for their company
CREATE POLICY "Users can view their company credential access"
ON public.credential_company_access
FOR SELECT
USING (company_id IN (
    SELECT p.company_id FROM profiles p WHERE p.id = (auth.uid())::text
));