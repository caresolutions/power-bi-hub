-- Create table for currency exchange rates managed by Master Admin
CREATE TABLE public.currency_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  currency_code TEXT NOT NULL UNIQUE,
  currency_name TEXT NOT NULL,
  currency_symbol TEXT NOT NULL,
  rate_to_brl NUMERIC(12, 6) NOT NULL DEFAULT 1,
  is_base_currency BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.currency_rates ENABLE ROW LEVEL SECURITY;

-- Everyone can read active currency rates (public pricing page)
CREATE POLICY "Anyone can view active currency rates"
ON public.currency_rates
FOR SELECT
USING (is_active = true);

-- Only master admins can manage currency rates
CREATE POLICY "Master admins can manage currency rates"
ON public.currency_rates
FOR ALL
USING (public.is_master_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_currency_rates_updated_at
  BEFORE UPDATE ON public.currency_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default currencies
INSERT INTO public.currency_rates (currency_code, currency_name, currency_symbol, rate_to_brl, is_base_currency) VALUES
('BRL', 'Real Brasileiro', 'R$', 1, true),
('USD', 'US Dollar', '$', 0.17, false),
('EUR', 'Euro', '€', 0.16, false),
('CNY', 'Yuan Chinês', '¥', 1.25, false);