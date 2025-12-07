-- Fix: User Email Addresses Exposed to All Authenticated Users
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create policy for users to view only their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING ((auth.uid())::text = id);

-- Create policy for admins to view all profiles (needed for user management)
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (has_role(auth.uid(), 'admin'));