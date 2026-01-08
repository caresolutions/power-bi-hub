-- Create table to track sent notifications (avoid duplicates)
CREATE TABLE public.notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for quick lookups
CREATE INDEX idx_notification_logs_user_type ON public.notification_logs(user_id, notification_type);
CREATE INDEX idx_notification_logs_sent_at ON public.notification_logs(sent_at);

-- Enable RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Only backend can insert/read notifications
CREATE POLICY "Service role can manage notifications"
ON public.notification_logs
FOR ALL
USING (false)
WITH CHECK (false);