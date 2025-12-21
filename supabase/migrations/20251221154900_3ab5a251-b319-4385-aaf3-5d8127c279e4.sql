-- Add report_page column to track which page of the dashboard was accessed
ALTER TABLE public.dashboard_access_logs 
ADD COLUMN report_page text DEFAULT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN public.dashboard_access_logs.report_page IS 'The report page name that was viewed (for page-level analytics)';