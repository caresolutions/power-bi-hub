import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.text();
    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      const signature = req.headers.get("stripe-signature");
      if (!signature) {
        throw new Error("No signature provided");
      }
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } else {
      // For testing without signature verification
      event = JSON.parse(body);
      logStep("WARNING: No webhook secret configured, skipping signature verification");
    }

    logStep("Event received", { type: event.type, id: event.id });

    const appUrl = Deno.env.get("APP_URL") || "https://app.carebi.com.br";

    switch (event.type) {
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        
        logStep("Payment failed", { customerId, invoiceId: invoice.id });

        // Get customer email
        const customer = await stripe.customers.retrieve(customerId);
        if (customer.deleted) {
          logStep("Customer was deleted");
          break;
        }

        const email = customer.email;
        if (!email) {
          logStep("No email found for customer");
          break;
        }

        // Find user by email in profiles
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("id, full_name")
          .eq("email", email)
          .single();

        if (!profile) {
          logStep("No profile found for email", { email });
          break;
        }

        // Check if we already sent a payment failed notification in the last 24 hours
        const { data: existingNotif } = await supabaseClient
          .from("notification_logs")
          .select("id")
          .eq("user_id", profile.id)
          .eq("notification_type", "payment_failed")
          .gte("sent_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .single();

        if (existingNotif) {
          logStep("Payment failed notification already sent recently");
          break;
        }

        // Send payment failure notification via the alerts function
        const alertResponse = await supabaseClient.functions.invoke("send-subscription-alerts", {
          body: {
            type: "payment_failed",
            userId: profile.id,
            email: email,
            userName: profile.full_name,
            failureReason: invoice.last_finalization_error?.message || "Cartão recusado",
          },
        });

        logStep("Payment failure alert sent", { response: alertResponse });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        logStep("Subscription deleted", { customerId, subscriptionId: subscription.id });

        // Update local subscription status
        const { error: updateError } = await supabaseClient
          .from("subscriptions")
          .update({ 
            status: "canceled",
            updated_at: new Date().toISOString()
          })
          .eq("stripe_subscription_id", subscription.id);

        if (updateError) {
          logStep("Error updating subscription status", { error: updateError.message });
        } else {
          logStep("Subscription marked as canceled");
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        
        logStep("Subscription updated", { 
          subscriptionId: subscription.id, 
          status: subscription.status 
        });

        // Map Stripe status to our status
        let localStatus = subscription.status;
        if (subscription.status === "active" && subscription.cancel_at_period_end) {
          localStatus = "canceling";
        }

        const { error: updateError } = await supabaseClient
          .from("subscriptions")
          .update({ 
            status: localStatus,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("stripe_subscription_id", subscription.id);

        if (updateError) {
          logStep("Error updating subscription", { error: updateError.message });
        } else {
          logStep("Subscription updated in database");
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        
        if (invoice.subscription) {
          logStep("Payment succeeded", { invoiceId: invoice.id, subscriptionId: invoice.subscription });
          
          // Update subscription to active if it was past_due
          const { error: updateError } = await supabaseClient
            .from("subscriptions")
            .update({ 
              status: "active",
              updated_at: new Date().toISOString()
            })
            .eq("stripe_subscription_id", invoice.subscription)
            .eq("status", "past_due");

          if (updateError) {
            logStep("Error updating subscription", { error: updateError.message });
          }
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
