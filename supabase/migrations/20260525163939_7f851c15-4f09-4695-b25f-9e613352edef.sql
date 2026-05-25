
-- 1. Improve get_company_admin_id to prefer admin with the "best" subscription
CREATE OR REPLACE FUNCTION public.get_company_admin_id(_company_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON ur.user_id::text = p.id
  LEFT JOIN public.subscriptions s ON s.user_id::text = p.id
  WHERE p.company_id = _company_id
    AND ur.role = 'admin'
  ORDER BY
    -- Prefer active/master_managed/non-trial subscriptions
    CASE WHEN s.status = 'active' THEN 0 ELSE 1 END,
    CASE WHEN s.is_master_managed THEN 0 ELSE 1 END,
    CASE WHEN s.status = 'trial' THEN 1 ELSE 0 END,
    CASE WHEN s.plan = 'enterprise' THEN 0 ELSE 1 END,
    p.created_at ASC
  LIMIT 1
$function$;

-- 2. Delete orphan individual subscription for invited user (role 'user')
DELETE FROM public.subscriptions
WHERE user_id IN (
  SELECT p.id::uuid
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON ur.user_id::text = p.id
  WHERE ur.role = 'user'
);
