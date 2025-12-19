import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-key',
};

// Validate webhook source using secret key
function validateWebhookSource(req: Request): boolean {
  const webhookKey = req.headers.get('X-Webhook-Key');
  const expectedKey = Deno.env.get('ZAPI_WEBHOOK_SECRET');
  
  // If no secret configured, allow requests but log warning
  if (!expectedKey) {
    console.warn('[SECURITY] ZAPI_WEBHOOK_SECRET not configured - webhook source validation disabled');
    return true;
  }
  
  if (!webhookKey) {
    console.error('[SECURITY] Missing X-Webhook-Key header');
    return false;
  }
  
  // Constant-time comparison to prevent timing attacks
  if (webhookKey.length !== expectedKey.length) {
    console.error('[SECURITY] Invalid webhook key length');
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < webhookKey.length; i++) {
    result |= webhookKey.charCodeAt(i) ^ expectedKey.charCodeAt(i);
  }
  
  if (result !== 0) {
    console.error('[SECURITY] Invalid webhook key');
    return false;
  }
  
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Log request metadata for audit
  const sourceIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  console.log(`[AUDIT] Webhook request from IP: ${sourceIP}`);

  try {
    // Validate webhook source
    if (!validateWebhookSource(req)) {
      console.error('[SECURITY] Webhook validation failed from IP:', sourceIP);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const SUPPORT_WHATSAPP_NUMBER = Deno.env.get('SUPPORT_WHATSAPP_NUMBER');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Parse body with error handling for malformed JSON
    let body;
    try {
      const rawText = await req.text();
      // Remove control characters that might break JSON parsing
      const cleanedText = rawText.replace(/[\x00-\x1F\x7F]/g, '');
      body = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('[AUDIT] JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('[AUDIT] Z-API webhook received, type:', body.type);

    // Ignore group messages - only process direct messages
    if (body.isGroup) {
      console.log('[AUDIT] Ignoring group message');
      return new Response(
        JSON.stringify({ success: true, message: 'Group message ignored' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle incoming message from support (direct message)
    // fromMe: true means message was SENT from the connected phone (support)
    // fromMe: false means message was RECEIVED by the connected phone
    if (body.type === 'ReceivedCallback' && body.text?.message) {
      const messageText = body.text.message;
      const messageId = body.messageId;
      const isFromSupport = body.fromMe === true;
      const senderPhone = body.phone;
      const connectedPhone = body.connectedPhone;

      console.log('[AUDIT] Processing ReceivedCallback');
      console.log('[AUDIT] fromMe:', body.fromMe);
      console.log('[AUDIT] senderPhone:', senderPhone);

      // Check if message contains email pattern (support response format)
      const emailMatch = messageText.match(/@([\w.-]+@[\w.-]+\.\w+)/);
      
      // Process as support message if: fromMe=true OR contains email pattern
      if (isFromSupport || emailMatch) {
        console.log('[AUDIT] Processing as potential support response...');
        
        if (emailMatch) {
          const userEmail = emailMatch[1];
          const responseMessage = messageText.replace(/@[\w.-]+@[\w.-]+\.\w+\s*/, '').trim();

          console.log('[AUDIT] Parsed email for user lookup');

          // Find user by email
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, company_id')
            .eq('email', userEmail)
            .single();

          if (profileError) {
            console.error('[AUDIT] Error finding profile');
          }

          if (profile) {
            // Save support response
            const { data: insertData, error: insertError } = await supabase
              .from('support_messages')
              .insert({
                user_id: profile.id,
                company_id: profile.company_id,
                message: responseMessage,
                sender_type: 'support',
                whatsapp_message_id: messageId,
                status: 'delivered',
              })
              .select()
              .single();

            if (insertError) {
              console.error('[AUDIT] Error saving support message');
            } else {
              console.log('[AUDIT] Support message saved successfully');
            }
          } else {
            console.log('[AUDIT] User not found for email pattern');
          }
        } else {
          console.log('[AUDIT] fromMe=true but no email pattern found');
        }
      } else {
        console.log('[AUDIT] Message does not match support response pattern, skipping...');
      }
    }

    // Handle message status updates
    if (body.type === 'MessageStatusCallback') {
      const { messageId, status } = body;
      
      let dbStatus = 'sent';
      if (status === 'DELIVERED' || status === 'DELIVERY_ACK') {
        dbStatus = 'delivered';
      } else if (status === 'READ' || status === 'VIEWED') {
        dbStatus = 'read';
      } else if (status === 'FAILED') {
        dbStatus = 'failed';
      }

      await supabase
        .from('support_messages')
        .update({ status: dbStatus })
        .eq('whatsapp_message_id', messageId);

      console.log('[AUDIT] Message status updated:', dbStatus);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[AUDIT] Error in zapi-webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
