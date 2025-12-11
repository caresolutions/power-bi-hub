-- Create enum for schedule types
CREATE TYPE public.schedule_frequency AS ENUM ('once', 'daily', 'weekly', 'monthly', 'interval');

-- Create enum for export format
CREATE TYPE public.export_format AS ENUM ('pdf', 'pptx');

-- Create table for report subscriptions
CREATE TABLE public.report_subscriptions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    dashboard_id UUID NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    created_by TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    export_format export_format NOT NULL DEFAULT 'pdf',
    report_page TEXT, -- Specific page to export (null = all pages)
    
    -- Schedule configuration
    frequency schedule_frequency NOT NULL DEFAULT 'daily',
    schedule_time TIME NOT NULL DEFAULT '08:00:00', -- Time of day to send
    schedule_days_of_week INTEGER[] DEFAULT '{1,2,3,4,5}', -- 0=Sun, 1=Mon, etc. (for weekly)
    schedule_day_of_month INTEGER, -- 1-31 (for monthly)
    schedule_interval_hours INTEGER, -- Hours between sends (for interval)
    
    -- Tracking
    last_sent_at TIMESTAMP WITH TIME ZONE,
    next_send_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for subscription recipients
CREATE TABLE public.subscription_recipients (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    subscription_id UUID NOT NULL REFERENCES public.report_subscriptions(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    apply_rls BOOLEAN NOT NULL DEFAULT false, -- If true, generate individual report with RLS
    rls_user_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL, -- User for RLS filtering
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    UNIQUE(subscription_id, email)
);

-- Create table for subscription logs
CREATE TABLE public.subscription_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    subscription_id UUID NOT NULL REFERENCES public.report_subscriptions(id) ON DELETE CASCADE,
    status TEXT NOT NULL, -- 'pending', 'exporting', 'sending', 'sent', 'failed'
    error_message TEXT,
    recipients_count INTEGER,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.report_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for report_subscriptions
CREATE POLICY "Admins can manage company subscriptions"
ON public.report_subscriptions
FOR ALL
USING (
    has_role(auth.uid(), 'admin'::app_role) 
    AND company_id IN (
        SELECT p.company_id 
        FROM profiles p 
        WHERE p.id = (auth.uid())::text
    )
);

-- RLS Policies for subscription_recipients
CREATE POLICY "Admins can manage subscription recipients"
ON public.subscription_recipients
FOR ALL
USING (
    subscription_id IN (
        SELECT rs.id 
        FROM report_subscriptions rs
        WHERE has_role(auth.uid(), 'admin'::app_role)
        AND rs.company_id IN (
            SELECT p.company_id 
            FROM profiles p 
            WHERE p.id = (auth.uid())::text
        )
    )
);

-- RLS Policies for subscription_logs
CREATE POLICY "Admins can view subscription logs"
ON public.subscription_logs
FOR SELECT
USING (
    subscription_id IN (
        SELECT rs.id 
        FROM report_subscriptions rs
        WHERE has_role(auth.uid(), 'admin'::app_role)
        AND rs.company_id IN (
            SELECT p.company_id 
            FROM profiles p 
            WHERE p.id = (auth.uid())::text
        )
    )
);

-- Add trigger for updated_at
CREATE TRIGGER update_report_subscriptions_updated_at
BEFORE UPDATE ON public.report_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();