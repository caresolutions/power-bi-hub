
-- Restrictions per page by user
CREATE TABLE public.dashboard_page_user_restrictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_visibility_id uuid NOT NULL REFERENCES public.dashboard_page_visibility(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  granted_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page_visibility_id, user_id)
);

-- Restrictions per page by group
CREATE TABLE public.dashboard_page_group_restrictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_visibility_id uuid NOT NULL REFERENCES public.dashboard_page_visibility(id) ON DELETE CASCADE,
  group_id uuid NOT NULL,
  granted_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page_visibility_id, group_id)
);

CREATE INDEX idx_dpur_user ON public.dashboard_page_user_restrictions(user_id);
CREATE INDEX idx_dpur_pv ON public.dashboard_page_user_restrictions(page_visibility_id);
CREATE INDEX idx_dpgr_group ON public.dashboard_page_group_restrictions(group_id);
CREATE INDEX idx_dpgr_pv ON public.dashboard_page_group_restrictions(page_visibility_id);

ALTER TABLE public.dashboard_page_user_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_page_group_restrictions ENABLE ROW LEVEL SECURITY;

-- USER restrictions policies
CREATE POLICY "Admins manage page user restrictions"
ON public.dashboard_page_user_restrictions FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.dashboard_page_visibility pv
    JOIN public.dashboards d ON d.id = pv.dashboard_id
    JOIN public.profiles p ON p.company_id = d.company_id
    WHERE pv.id = dashboard_page_user_restrictions.page_visibility_id
      AND p.id = (auth.uid())::text
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.dashboard_page_visibility pv
    JOIN public.dashboards d ON d.id = pv.dashboard_id
    JOIN public.profiles p ON p.company_id = d.company_id
    WHERE pv.id = dashboard_page_user_restrictions.page_visibility_id
      AND p.id = (auth.uid())::text
  )
);

CREATE POLICY "Master admins manage all page user restrictions"
ON public.dashboard_page_user_restrictions FOR ALL
USING (is_master_admin(auth.uid()))
WITH CHECK (is_master_admin(auth.uid()));

CREATE POLICY "Users view their own page restrictions"
ON public.dashboard_page_user_restrictions FOR SELECT
USING ((auth.uid())::text = user_id);

-- GROUP restrictions policies
CREATE POLICY "Admins manage page group restrictions"
ON public.dashboard_page_group_restrictions FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.dashboard_page_visibility pv
    JOIN public.dashboards d ON d.id = pv.dashboard_id
    JOIN public.profiles p ON p.company_id = d.company_id
    WHERE pv.id = dashboard_page_group_restrictions.page_visibility_id
      AND p.id = (auth.uid())::text
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.dashboard_page_visibility pv
    JOIN public.dashboards d ON d.id = pv.dashboard_id
    JOIN public.profiles p ON p.company_id = d.company_id
    WHERE pv.id = dashboard_page_group_restrictions.page_visibility_id
      AND p.id = (auth.uid())::text
  )
);

CREATE POLICY "Master admins manage all page group restrictions"
ON public.dashboard_page_group_restrictions FOR ALL
USING (is_master_admin(auth.uid()))
WITH CHECK (is_master_admin(auth.uid()));

CREATE POLICY "Users view page restrictions of their groups"
ON public.dashboard_page_group_restrictions FOR SELECT
USING (
  group_id IN (
    SELECT ugm.group_id FROM public.user_group_members ugm
    WHERE ugm.user_id = (auth.uid())::text
  )
);
