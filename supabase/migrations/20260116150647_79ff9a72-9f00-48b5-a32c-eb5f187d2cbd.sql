
-- Function to find the admin user_id of a company (bypasses RLS with SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_company_admin_id(_company_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON ur.user_id::text = p.id
  WHERE p.company_id = _company_id
    AND ur.role = 'admin'
  LIMIT 1
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_company_admin_id(uuid) TO authenticated;
