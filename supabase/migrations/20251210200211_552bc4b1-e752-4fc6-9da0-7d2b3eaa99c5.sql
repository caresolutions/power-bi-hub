-- Create support chat messages table
CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id UUID,
  message TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'support')),
  whatsapp_message_id TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own messages
CREATE POLICY "Users can view their own messages"
ON public.support_messages
FOR SELECT
USING ((auth.uid())::text = user_id);

-- Users can insert their own messages
CREATE POLICY "Users can insert their own messages"
ON public.support_messages
FOR INSERT
WITH CHECK ((auth.uid())::text = user_id);

-- Admins can view all messages from their company
CREATE POLICY "Admins can view company messages"
ON public.support_messages
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND company_id IN (
    SELECT profiles.company_id FROM profiles WHERE profiles.id = (auth.uid())::text
  )
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;