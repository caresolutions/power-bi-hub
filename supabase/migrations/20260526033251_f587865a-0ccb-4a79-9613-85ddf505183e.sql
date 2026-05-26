
CREATE OR REPLACE FUNCTION public.get_visible_dashboard_pages(_dashboard_id uuid)
RETURNS TABLE (
  page_name text,
  page_display_name text,
  display_order int,
  is_visible boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH pv AS (
    SELECT id, page_name, page_display_name, display_order, is_visible
    FROM public.dashboard_page_visibility
    WHERE dashboard_id = _dashboard_id
  ),
  restricted AS (
    SELECT page_visibility_id FROM public.dashboard_page_user_restrictions
    WHERE page_visibility_id IN (SELECT id FROM pv)
    UNION
    SELECT page_visibility_id FROM public.dashboard_page_group_restrictions
    WHERE page_visibility_id IN (SELECT id FROM pv)
  ),
  allowed AS (
    SELECT page_visibility_id FROM public.dashboard_page_user_restrictions
    WHERE user_id = (auth.uid())::text
      AND page_visibility_id IN (SELECT id FROM pv)
    UNION
    SELECT gr.page_visibility_id
    FROM public.dashboard_page_group_restrictions gr
    JOIN public.user_group_members ugm ON ugm.group_id = gr.group_id
    WHERE ugm.user_id = (auth.uid())::text
      AND gr.page_visibility_id IN (SELECT id FROM pv)
  )
  SELECT pv.page_name, pv.page_display_name, pv.display_order, pv.is_visible
  FROM pv
  WHERE pv.is_visible = true
    AND (
      public.is_master_admin(auth.uid())
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR pv.id NOT IN (SELECT page_visibility_id FROM restricted)
      OR pv.id IN (SELECT page_visibility_id FROM allowed)
    );
$$;
