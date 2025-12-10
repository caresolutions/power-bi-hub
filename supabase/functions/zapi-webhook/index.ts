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

    // Parse body with error handling for malformed JSON
    let body;
    try {
      const rawText = await req.text();
      // Remove control characters that might break JSON parsing
      const cleanedText = rawText.replace(/[\x00-\x1F\x7F]/g, '');
      body = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parse error';
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload', details: errorMessage }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Z-API webhook received:', JSON.stringify(body, null, 2));

    // Ignore group messages - only process direct messages
    if (body.isGroup) {
      console.log('Ignoring group message');
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

      console.log('=== Processing ReceivedCallback ===');
      console.log('fromMe:', body.fromMe);
      console.log('senderPhone:', senderPhone);
      console.log('connectedPhone:', connectedPhone);
      console.log('messageText:', messageText);
      console.log('messageId:', messageId);

      // Check if message contains email pattern (support response format)
      const emailMatch = messageText.match(/@([\w.-]+@[\w.-]+\.\w+)/);
      
      // Process as support message if: fromMe=true OR contains email pattern
      if (isFromSupport || emailMatch) {
        console.log('Processing as potential support response...');
        
        if (emailMatch) {
          const userEmail = emailMatch[1];
          const responseMessage = messageText.replace(/@[\w.-]+@[\w.-]+\.\w+\s*/, '').trim();

          console.log('Parsed email:', userEmail);
          console.log('Response message:', responseMessage);

          // Find user by email
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, company_id')
            .eq('email', userEmail)
            .single();

          if (profileError) {
            console.error('Error finding profile:', profileError);
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
              console.error('Error saving support message:', insertError);
            } else {
              console.log('Support message saved successfully:', insertData);
            }
          } else {
            console.log('User not found for email:', userEmail);
          }
        } else {
          console.log('fromMe=true but no email pattern found. Expected format: @email@example.com Response');
        }
      } else {
        console.log('Message does not match support response pattern, skipping...');
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
      JSON.stringify({ success: true, receivedBody: body }),
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
