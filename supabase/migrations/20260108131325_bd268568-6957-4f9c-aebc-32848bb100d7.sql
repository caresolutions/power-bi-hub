
-- Remove the overly permissive INSERT policy that allows any authenticated user to create companies
DROP POLICY "Authenticated users can create companies" ON public.companies;
