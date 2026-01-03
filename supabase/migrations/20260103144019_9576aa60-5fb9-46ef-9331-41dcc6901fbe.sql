-- Add stripe_additional_user_price_id column to subscription_plans
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS stripe_additional_user_price_id text;

-- Update plans with additional user price IDs
UPDATE public.subscription_plans 
SET stripe_additional_user_price_id = 'price_1SlVz8IanwCICrsHcip7leLr'
WHERE plan_key = 'starter';

UPDATE public.subscription_plans 
SET stripe_additional_user_price_id = 'price_1SlVzQIanwCICrsH6c39HGQL'
WHERE plan_key = 'growth';

UPDATE public.subscription_plans 
SET stripe_additional_user_price_id = 'price_1SlVzhIanwCICrsH2zBflncq'
WHERE plan_key = 'scale';