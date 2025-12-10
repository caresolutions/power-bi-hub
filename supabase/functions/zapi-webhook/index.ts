import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const SUPPORT_WHATSAPP_NUMBER = Deno.env.get('SUPPORT_WHATSAPP_NUMBER');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const body = await req.json();
    console.log('Z-API webhook received:', JSON.stringify(body, null, 2));

    // Handle incoming message from support
    if (body.type === 'ReceivedCallback' && body.text?.message) {
      const senderPhone = body.phone;
      const messageText = body.text.message;
      const messageId = body.messageId;

      // Check if message is from support number (response to user)
      if (senderPhone === SUPPORT_WHATSAPP_NUMBER) {
        // Parse the response to find which user it's for
        // Support should reply with format: "@email@example.com Resposta aqui"
        const emailMatch = messageText.match(/@([\w.-]+@[\w.-]+\.\w+)/);
        
        if (emailMatch) {
          const userEmail = emailMatch[1];
          const responseMessage = messageText.replace(/@[\w.-]+@[\w.-]+\.\w+\s*/, '').trim();

          // Find user by email
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, company_id')
            .eq('email', userEmail)
            .single();

          if (profile) {
            // Save support response
            await supabase
              .from('support_messages')
              .insert({
                user_id: profile.id,
                company_id: profile.company_id,
                message: responseMessage,
                sender_type: 'support',
                whatsapp_message_id: messageId,
                status: 'delivered',
              });

            console.log('Support message saved for user:', userEmail);
          } else {
            console.log('User not found for email:', userEmail);
          }
        }
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

      console.log('Message status updated:', messageId, dbStatus);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in zapi-webhook:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
