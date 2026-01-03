import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get local subscription from database
    const { data: localSub } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    logStep("Local subscription found", localSub);

    // Check if is master managed (skip Stripe check)
    if (localSub?.is_master_managed) {
      logStep("Subscription is master managed, skipping Stripe check");
      
      // Get plan details
      const { data: planData } = await supabaseClient
        .from("subscription_plans")
        .select("*")
        .eq("plan_key", localSub.plan)
        .maybeSingle();

      return new Response(JSON.stringify({
        subscribed: localSub.status === "active" || localSub.status === "trial",
        status: localSub.status,
        planKey: localSub.plan,
        planName: planData?.name || localSub.plan,
        productId: planData?.stripe_product_id || null,
        subscriptionEnd: localSub.current_period_end,
        isTrialing: localSub.status === "trial",
        isMasterManaged: true,
        isBlocked: false,
        trialDaysRemaining: calculateTrialDaysRemaining(localSub),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      
      // Check if local subscription is active or trial
      if (localSub?.status === "active" || localSub?.status === "trial") {
        const isTrialing = localSub.status === "trial";
        
        // Check if subscription period is still valid
        let isBlocked = false;
        let trialDaysRemaining = 0;
        
        if (localSub.current_period_end) {
          const endDate = new Date(localSub.current_period_end);
          const now = new Date();
          const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (isTrialing) {
            trialDaysRemaining = daysRemaining;
            isBlocked = daysRemaining <= 0;
          } else {
            // Active subscription - check if period ended
            isBlocked = daysRemaining < 0;
          }
        } else if (isTrialing) {
          // No end date set for trial, calculate from created_at
          trialDaysRemaining = calculateTrialDaysRemaining(localSub);
          isBlocked = trialDaysRemaining <= 0;
        }

        // Update subscription status if expired
        if (isBlocked && (localSub.status === "trial" || localSub.status === "active")) {
          await supabaseClient
            .from("subscriptions")
            .update({ status: "expired" })
            .eq("id", localSub.id);
        }

        // Get plan details
        const { data: planData } = await supabaseClient
          .from("subscription_plans")
          .select("*")
          .eq("plan_key", localSub.plan)
          .maybeSingle();

        return new Response(JSON.stringify({ 
          subscribed: !isBlocked,
          status: isBlocked ? "expired" : localSub.status,
          planKey: localSub.plan,
          planName: planData?.name || localSub.plan,
          productId: planData?.stripe_product_id || null, 
          subscriptionEnd: localSub.current_period_end, 
          isTrialing: isTrialing && !isBlocked,
          isMasterManaged: false,
          isBlocked,
          trialDaysRemaining: Math.max(0, trialDaysRemaining),
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      return new Response(JSON.stringify({ 
        subscribed: false, 
        status: "inactive",
        planKey: null,
        productId: null, 
        subscriptionEnd: null, 
        isTrialing: false,
        isMasterManaged: false,
        isBlocked: true,
        trialDaysRemaining: 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });

    const activeSubscription = subscriptions.data.find(
      (sub: Stripe.Subscription) => sub.status === "active" || sub.status === "trialing"
    );

    if (!activeSubscription) {
      logStep("No active Stripe subscription found");
      
      // Check if subscription is past_due or canceled
      const recentSub = subscriptions.data[0];
      const gracePeriodEnd = recentSub?.current_period_end 
        ? new Date(recentSub.current_period_end * 1000)
        : null;
      
      let isBlocked = true;
      let daysRemaining = 0;
      
      // 30-day grace period after cancellation/expiration
      if (gracePeriodEnd) {
        const gracePeriodEndDate = new Date(gracePeriodEnd);
        gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + 30);
        const now = new Date();
        daysRemaining = Math.ceil((gracePeriodEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        isBlocked = daysRemaining <= 0;
      }

      // Get plan from productId if available
      let planKey = localSub?.plan || null;
      if (recentSub?.items?.data?.[0]?.price?.product) {
        const productId = recentSub.items.data[0].price.product as string;
        const { data: planData } = await supabaseClient
          .from("subscription_plans")
          .select("plan_key")
          .eq("stripe_product_id", productId)
          .maybeSingle();
        
        if (planData) {
          planKey = planData.plan_key;
        }
      }

      // Update local subscription
      if (localSub) {
        await supabaseClient
          .from("subscriptions")
          .update({ 
            status: isBlocked ? "expired" : "canceled",
            stripe_customer_id: customerId,
            stripe_subscription_id: recentSub?.id || null,
          })
          .eq("id", localSub.id);
      }

      return new Response(JSON.stringify({ 
        subscribed: false, 
        status: recentSub?.status || "inactive",
        planKey,
        productId: recentSub?.items?.data?.[0]?.price?.product || null, 
        subscriptionEnd: recentSub?.current_period_end 
          ? new Date(recentSub.current_period_end * 1000).toISOString() 
          : null, 
        isTrialing: false,
        isMasterManaged: false,
        isBlocked,
        gracePeriodDaysRemaining: Math.max(0, daysRemaining),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscriptionEnd = new Date(activeSubscription.current_period_end * 1000).toISOString();
    const productId = activeSubscription.items.data[0].price.product as string;
    const isTrialing = activeSubscription.status === "trialing";
    
    logStep("Active subscription found", { 
      subscriptionId: activeSubscription.id, 
      productId, 
      endDate: subscriptionEnd,
      isTrialing 
    });

    // Get plan_key from product_id
    const { data: planData } = await supabaseClient
      .from("subscription_plans")
      .select("*")
      .eq("stripe_product_id", productId)
      .maybeSingle();

    const planKey = planData?.plan_key || null;
    logStep("Plan found", { planKey, planName: planData?.name });

    // Sync with local subscription table
    const subscriptionData = {
      status: isTrialing ? "trial" : "active",
      plan: planKey || "free",
      stripe_customer_id: customerId,
      stripe_subscription_id: activeSubscription.id,
      current_period_start: new Date(activeSubscription.current_period_start * 1000).toISOString(),
      current_period_end: subscriptionEnd,
    };

    if (localSub) {
      await supabaseClient
        .from("subscriptions")
        .update(subscriptionData)
        .eq("id", localSub.id);
      logStep("Local subscription updated");
    }

    // Calculate trial days remaining if in trial
    let trialDaysRemaining = 0;
    if (isTrialing && activeSubscription.trial_end) {
      const trialEnd = new Date(activeSubscription.trial_end * 1000);
      const now = new Date();
      trialDaysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    return new Response(JSON.stringify({
      subscribed: true,
      status: isTrialing ? "trial" : "active",
      planKey,
      planName: planData?.name || planKey,
      productId,
      subscriptionEnd,
      isTrialing,
      isMasterManaged: false,
      isBlocked: false,
      trialDaysRemaining: Math.max(0, trialDaysRemaining),
    }), {
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

function calculateTrialDaysRemaining(subscription: any): number {
  if (!subscription?.current_period_end) {
    // Default 7 days from created_at
    const createdAt = new Date(subscription?.created_at || new Date());
    const trialEnd = new Date(createdAt);
    trialEnd.setDate(trialEnd.getDate() + 7);
    const now = new Date();
    return Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }
  
  const endDate = new Date(subscription.current_period_end);
  const now = new Date();
  return Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}