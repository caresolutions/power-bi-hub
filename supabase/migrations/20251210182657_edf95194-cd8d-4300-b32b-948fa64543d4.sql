-- Add policy to allow authenticated users to check if CNPJ exists (for uniqueness validation)
CREATE POLICY "Authenticated users can check CNPJ uniqueness"
  ON public.companies FOR SELECT
  TO authenticated
  USING (true);