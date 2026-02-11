
-- Company-level custom limits (overrides plan defaults)
CREATE TABLE public.company_custom_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  limit_key TEXT NOT NULL,
  limit_value INTEGER,
  is_unlimited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, limit_key)
);

-- Company-level custom features (overrides plan defaults)
CREATE TABLE public.company_custom_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  feature_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, feature_key)
);

-- Enable RLS
ALTER TABLE public.company_custom_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_custom_features ENABLE ROW LEVEL SECURITY;

-- RLS: Master admins can manage all
CREATE POLICY "Master admins can manage company custom limits"
ON public.company_custom_limits FOR ALL
USING (is_master_admin(auth.uid()));

CREATE POLICY "Master admins can manage company custom features"
ON public.company_custom_features FOR ALL
USING (is_master_admin(auth.uid()));

-- RLS: Users can view their own company's custom limits/features
CREATE POLICY "Users can view their company custom limits"
ON public.company_custom_limits FOR SELECT
USING (company_id IN (
  SELECT p.company_id FROM profiles p WHERE p.id = (auth.uid())::text
));

CREATE POLICY "Users can view their company custom features"
ON public.company_custom_features FOR SELECT
USING (company_id IN (
  SELECT p.company_id FROM profiles p WHERE p.id = (auth.uid())::text
));

-- Triggers for updated_at
CREATE TRIGGER update_company_custom_limits_updated_at
BEFORE UPDATE ON public.company_custom_limits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
