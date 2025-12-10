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
    const ZAPI_INSTANCE_ID = Deno.env.get('ZAPI_INSTANCE_ID');
    const ZAPI_TOKEN = Deno.env.get('ZAPI_TOKEN');
    const ZAPI_CLIENT_TOKEN = Deno.env.get('ZAPI_CLIENT_TOKEN');
    const SUPPORT_WHATSAPP_NUMBER = Deno.env.get('SUPPORT_WHATSAPP_NUMBER');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN || !SUPPORT_WHATSAPP_NUMBER) {
      console.error('Missing Z-API configuration');
      return new Response(
        JSON.stringify({ error: 'Z-API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('User auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { message } = await req.json();
    
    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile for company_id and name
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, full_name, email')
      .eq('id', user.id)
      .single();

    // Format message with user info
    const formattedMessage = `[Care BI - Suporte]\nUsuário: ${profile?.full_name || user.email}\nEmail: ${profile?.email || user.email}\n\nMensagem:\n${message}`;

    // Send message via Z-API
    const zapiUrl = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;
    
    const zapiResponse = await fetch(zapiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': ZAPI_CLIENT_TOKEN || '',
      },
      body: JSON.stringify({
        phone: SUPPORT_WHATSAPP_NUMBER,
        message: formattedMessage,
      }),
    });

    const zapiResult = await zapiResponse.json();
    console.log('Z-API response:', zapiResult);

    if (!zapiResponse.ok) {
      console.error('Z-API error:', zapiResult);
      return new Response(
        JSON.stringify({ error: 'Failed to send message via Z-API' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save message to database
    const { data: savedMessage, error: saveError } = await supabase
      .from('support_messages')
      .insert({
        user_id: user.id,
        company_id: profile?.company_id,
        message: message,
        sender_type: 'user',
        whatsapp_message_id: zapiResult.messageId,
        status: 'sent',
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving message:', saveError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: zapiResult.messageId,
        savedMessage 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in zapi-send-message:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
