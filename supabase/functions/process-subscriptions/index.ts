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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    const currentDayOfWeek = now.getUTCDay();
    const currentDayOfMonth = now.getUTCDate();

    console.log(`Processing subscriptions at ${now.toISOString()}`);
    console.log(`Current time: ${currentHour}:${currentMinute}, Day of week: ${currentDayOfWeek}, Day of month: ${currentDayOfMonth}`);

    // Get all active subscriptions
    const { data: subscriptions, error } = await supabase
      .from('report_subscriptions')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching subscriptions:', error);
      throw error;
    }

    console.log(`Found ${subscriptions?.length || 0} active subscriptions`);

    const subscriptionsToProcess: string[] = [];

    for (const sub of subscriptions || []) {
      const scheduleTime = sub.schedule_time.substring(0, 5).split(':');
      const scheduleHour = parseInt(scheduleTime[0]);
      const scheduleMinute = parseInt(scheduleTime[1]);

      let shouldProcess = false;

      // Check if current time matches schedule (within 5 minute window)
      const timeMatches = currentHour === scheduleHour && 
        Math.abs(currentMinute - scheduleMinute) <= 5;

      switch (sub.frequency) {
        case 'once':
          // Only process if not sent yet and time matches
          if (!sub.last_sent_at && timeMatches) {
            shouldProcess = true;
          }
          break;

        case 'daily':
          if (timeMatches) {
            shouldProcess = true;
          }
          break;

        case 'weekly':
          if (timeMatches && sub.schedule_days_of_week?.includes(currentDayOfWeek)) {
            shouldProcess = true;
          }
          break;

        case 'monthly':
          if (timeMatches && sub.schedule_day_of_month === currentDayOfMonth) {
            shouldProcess = true;
          }
          break;

        case 'interval':
          // Check if enough hours have passed since last send
          if (sub.last_sent_at) {
            const lastSent = new Date(sub.last_sent_at);
            const hoursSinceLastSend = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
            if (hoursSinceLastSend >= (sub.schedule_interval_hours || 6)) {
              shouldProcess = true;
            }
          } else {
            // Never sent, process now
            shouldProcess = true;
          }
          break;
      }

      // Check if already sent recently (within last hour) to avoid duplicates
      if (shouldProcess && sub.last_sent_at) {
        const lastSent = new Date(sub.last_sent_at);
        const minutesSinceLastSend = (now.getTime() - lastSent.getTime()) / (1000 * 60);
        if (sub.frequency !== 'interval' && minutesSinceLastSend < 60) {
          console.log(`Skipping ${sub.name} - already sent within the last hour`);
          shouldProcess = false;
        }
      }

      if (shouldProcess) {
        subscriptionsToProcess.push(sub.id);
        console.log(`Queuing subscription: ${sub.name} (${sub.id})`);
      }
    }

    console.log(`Processing ${subscriptionsToProcess.length} subscriptions`);

    // Process each subscription
    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const subscriptionId of subscriptionsToProcess) {
      try {
        // Call export-report function
        const exportResponse = await fetch(
          `${supabaseUrl}/functions/v1/export-report`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ subscriptionId }),
          }
        );

        const exportResult = await exportResponse.json();
        
        results.push({
          id: subscriptionId,
          success: exportResult.success,
          error: exportResult.error,
        });

        if (exportResult.success) {
          console.log(`Successfully processed subscription ${subscriptionId}`);
        } else {
          console.error(`Failed to process subscription ${subscriptionId}:`, exportResult.error);
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Error processing subscription ${subscriptionId}:`, errorMessage);
        results.push({
          id: subscriptionId,
          success: false,
          error: errorMessage,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: subscriptionsToProcess.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in process-subscriptions function:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
