-- RLS Policies for user_groups
CREATE POLICY "Master admins can manage all groups"
ON public.user_groups FOR ALL
USING (public.is_master_admin(auth.uid()));

CREATE POLICY "Admins can manage company groups"
ON public.user_groups FOR ALL
USING (
    has_role(auth.uid(), 'admin'::app_role) 
    AND company_id IN (
        SELECT p.company_id FROM profiles p WHERE p.id = (auth.uid())::text
    )
);

CREATE POLICY "Users can view their company groups"
ON public.user_groups FOR SELECT
USING (
    company_id IN (
        SELECT p.company_id FROM profiles p WHERE p.id = (auth.uid())::text
    )
);

-- RLS Policies for user_group_members
CREATE POLICY "Master admins can manage all group members"
ON public.user_group_members FOR ALL
USING (public.is_master_admin(auth.uid()));

CREATE POLICY "Admins can manage company group members"
ON public.user_group_members FOR ALL
USING (
    has_role(auth.uid(), 'admin'::app_role) 
    AND group_id IN (
        SELECT ug.id FROM user_groups ug 
        JOIN profiles p ON p.company_id = ug.company_id 
        WHERE p.id = (auth.uid())::text
    )
);

CREATE POLICY "Users can view their own memberships"
ON public.user_group_members FOR SELECT
USING ((auth.uid())::text = user_id);

-- RLS Policies for group_dashboard_access
CREATE POLICY "Master admins can manage all group access"
ON public.group_dashboard_access FOR ALL
USING (public.is_master_admin(auth.uid()));

CREATE POLICY "Admins can manage company group access"
ON public.group_dashboard_access FOR ALL
USING (
    has_role(auth.uid(), 'admin'::app_role) 
    AND group_id IN (
        SELECT ug.id FROM user_groups ug 
        JOIN profiles p ON p.company_id = ug.company_id 
        WHERE p.id = (auth.uid())::text
    )
);

CREATE POLICY "Users can view group access for their groups"
ON public.group_dashboard_access FOR SELECT
USING (
    group_id IN (
        SELECT ugm.group_id FROM user_group_members ugm 
        WHERE ugm.user_id = (auth.uid())::text
    )
);

-- Update dashboards SELECT policy to include group access
DROP POLICY IF EXISTS "Users can view company dashboards or granted access" ON public.dashboards;

CREATE POLICY "Users can view dashboards with access"
ON public.dashboards FOR SELECT
USING (
    public.is_master_admin(auth.uid())
    OR company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.id = (auth.uid())::text)
    OR EXISTS (SELECT 1 FROM user_dashboard_access WHERE dashboard_id = dashboards.id AND user_id = (auth.uid())::text)
    OR public.has_group_dashboard_access((auth.uid())::text, id)
);

-- Master admin policies for companies
CREATE POLICY "Master admins can view all companies"
ON public.companies FOR SELECT
USING (public.is_master_admin(auth.uid()));

CREATE POLICY "Master admins can create companies"
ON public.companies FOR INSERT
WITH CHECK (public.is_master_admin(auth.uid()));

CREATE POLICY "Master admins can update all companies"
ON public.companies FOR UPDATE
USING (public.is_master_admin(auth.uid()));

CREATE POLICY "Master admins can delete companies"
ON public.companies FOR DELETE
USING (public.is_master_admin(auth.uid()));

-- Master admin policies for profiles
CREATE POLICY "Master admins can manage all profiles"
ON public.profiles FOR ALL
USING (public.is_master_admin(auth.uid()));

-- Master admin policies for dashboards
CREATE POLICY "Master admins can manage all dashboards"
ON public.dashboards FOR ALL
USING (public.is_master_admin(auth.uid()));