-- Drop existing policy
DROP POLICY IF EXISTS "Anyone can insert company during signup" ON public.companies;

-- Create new policy that allows authenticated users to insert companies
CREATE POLICY "Authenticated users can create companies"
  ON public.companies FOR INSERT
  TO authenticated
  WITH CHECK (true);