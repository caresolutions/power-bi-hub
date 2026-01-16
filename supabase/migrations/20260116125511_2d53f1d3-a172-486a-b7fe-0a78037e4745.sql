-- Allow admins to create their own company during onboarding
CREATE POLICY "Admins can create their own company" 
ON public.companies 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));