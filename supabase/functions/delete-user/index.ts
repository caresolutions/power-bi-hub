import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, deleteFromAuth } = await req.json();

    if (!userId) {
      throw new Error("userId is required");
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Remove dashboard access
    await supabaseAdmin
      .from("user_dashboard_access")
      .delete()
      .eq("user_id", userId);

    // Remove group memberships
    await supabaseAdmin
      .from("user_group_members")
      .delete()
      .eq("user_id", userId);

    // Remove refresh permissions
    await supabaseAdmin
      .from("user_dashboard_refresh_permissions")
      .delete()
      .eq("user_id", userId);

    // Remove access log permissions
    await supabaseAdmin
      .from("access_log_permissions")
      .delete()
      .eq("user_id", userId);

    // Remove onboarding progress
    await supabaseAdmin
      .from("onboarding_progress")
      .delete()
      .eq("user_id", userId);

    // Remove subscriptions
    await supabaseAdmin
      .from("subscriptions")
      .delete()
      .eq("user_id", userId);

    // Remove user roles
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    // Delete profile
    await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    // Delete from auth if requested
    if (deleteFromAuth) {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      
      if (authError) {
        console.error("Error deleting user from auth:", authError);
        // Don't throw - user data was already cleaned up
      } else {
        console.log("User deleted from auth:", userId);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: deleteFromAuth 
          ? "Usuário excluído completamente" 
          : "Usuário removido da empresa",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in delete-user:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
