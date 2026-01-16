
-- Create function to get subscription by user_id with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.get_user_subscription(_user_id text)
RETURNS TABLE (
  id uuid,
  user_id text,
  status text,
  plan text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  is_master_managed boolean,
  stripe_customer_id text,
  stripe_subscription_id text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.id,
    s.user_id::text,
    s.status,
    s.plan,
    s.current_period_start,
    s.current_period_end,
    s.is_master_managed,
    s.stripe_customer_id,
    s.stripe_subscription_id
  FROM public.subscriptions s
  WHERE s.user_id::text = _user_id
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_user_subscription(text) TO authenticated;
