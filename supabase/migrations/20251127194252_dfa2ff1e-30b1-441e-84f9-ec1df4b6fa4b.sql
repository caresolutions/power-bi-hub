-- Allow users to view all profiles (needed for inviting users)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Users can still only update their own profile
-- Insert policy remains the same (via trigger)