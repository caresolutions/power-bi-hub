-- Allow admins to delete profiles from their company
CREATE POLICY "Admins can delete company profiles"
ON public.profiles
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND company_id IN (
    SELECT p.company_id 
    FROM profiles p 
    WHERE p.id = (auth.uid())::text
  )
);