import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-ADDITIONAL-USER-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const { quantity } = await req.json();
    if (!quantity || quantity < 1) throw new Error("Quantity must be at least 1");
    logStep("Quantity received", { quantity });

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get user's profile and subscription
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile?.company_id) throw new Error("User has no company");
    logStep("User company found", { companyId: profile.company_id });

    // Get user's current subscription to determine the plan
    const { data: subscription } = await supabaseClient
      .from("subscriptions")
      .select("plan, stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (!subscription) throw new Error("User has no subscription");
    logStep("User subscription found", { plan: subscription.plan });

    // Get plan details with additional user price
    const { data: planData } = await supabaseClient
      .from("subscription_plans")
      .select("stripe_additional_user_price_id, price_additional_user, plan_key, name")
      .eq("plan_key", subscription.plan)
      .single();

    if (!planData?.stripe_additional_user_price_id) {
      throw new Error("This plan does not support additional users");
    }
    logStep("Plan found", { 
      planKey: planData.plan_key, 
      priceId: planData.stripe_additional_user_price_id,
      pricePerUser: planData.price_additional_user 
    });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    let customerId = subscription.stripe_customer_id;
    if (!customerId) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Existing customer found", { customerId });
      }
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";

    // Build session params - only use customer OR customer_email, not both
    const sessionParams: any = {
      line_items: [
        {
          price: planData.stripe_additional_user_price_id,
          quantity: quantity,
        },
      ],
      mode: "subscription",
      metadata: {
        type: "additional_users",
        company_id: profile.company_id,
        user_id: user.id,
        quantity: String(quantity),
      },
      success_url: `${origin}/add-users?success=true&quantity=${quantity}`,
      cancel_url: `${origin}/add-users?canceled=true`,
    };

    // Only set one of customer or customer_email
    if (customerId) {
      sessionParams.customer = customerId;
    } else {
      sessionParams.customer_email = user.email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
