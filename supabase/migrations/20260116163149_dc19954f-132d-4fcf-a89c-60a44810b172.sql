
-- Fix the trigger to NOT create subscription for invited users
-- Only admins (non-invited users) should have subscriptions
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    invitation_record RECORD;
BEGIN
    -- Check if user was invited
    SELECT * INTO invitation_record 
    FROM public.user_invitations 
    WHERE email = NEW.email 
    AND accepted_at IS NULL 
    AND expires_at > now()
    LIMIT 1;
    
    IF invitation_record.id IS NOT NULL THEN
        -- User was invited, assign role from invitation
        INSERT INTO public.user_roles (user_id, role) 
        VALUES (NEW.id, invitation_record.invited_role::app_role);
        
        -- Update profile with company_id from invitation
        UPDATE public.profiles 
        SET company_id = invitation_record.company_id 
        WHERE id = NEW.id::text;
        
        -- Mark invitation as accepted
        UPDATE public.user_invitations 
        SET accepted_at = now() 
        WHERE id = invitation_record.id;
        
        -- Grant access to dashboards from invitation
        INSERT INTO public.user_dashboard_access (dashboard_id, user_id, granted_by)
        SELECT unnest(invitation_record.dashboard_ids), NEW.id::text, invitation_record.invited_by::text;
        
        -- DO NOT create subscription for invited users
        -- They use the admin's subscription via company_id
    ELSE
        -- New signup without invitation = admin (will need to create company)
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
        
        -- Create trial subscription with 'starter' plan ONLY for admins
        INSERT INTO public.subscriptions (user_id, status, plan) VALUES (NEW.id, 'trial', 'starter');
    END IF;
    
    RETURN NEW;
END;
$function$;
