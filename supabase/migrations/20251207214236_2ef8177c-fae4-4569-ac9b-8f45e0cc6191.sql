-- Fix: Invitation Tokens Readable by Anyone
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view their own invitation by token" ON public.user_invitations;

-- Create a more restrictive policy that only allows viewing invitations where:
-- 1. The email matches the authenticated user's email (for accepting invitations)
-- Note: We need to allow unauthenticated access for initial token verification during signup,
-- but this should be done via a secure edge function, not direct table access

-- For authenticated users, only show their own invitations
CREATE POLICY "Users can view invitations for their email" ON public.user_invitations
FOR SELECT USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);