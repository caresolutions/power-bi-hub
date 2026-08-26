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

    // ---- Authorization: only master admins, or admins of the same company ----
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(token);
    const caller = authData?.user;

    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (caller.id === userId) {
      return new Response(JSON.stringify({ error: "Você não pode excluir o próprio usuário" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const roles = (callerRoles ?? []).map((r: { role: string }) => r.role);
    const isMaster = roles.includes("master_admin");
    const isAdmin = roles.includes("admin");

    if (!isMaster && !isAdmin) {
      return new Response(JSON.stringify({ error: "Permissão negada" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isMaster) {
      const [{ data: callerProfile }, { data: targetProfile }] = await Promise.all([
        supabaseAdmin.from("profiles").select("company_id").eq("id", caller.id).maybeSingle(),
        supabaseAdmin.from("profiles").select("company_id").eq("id", userId).maybeSingle(),
      ]);

      if (
        !callerProfile?.company_id ||
        !targetProfile?.company_id ||
        callerProfile.company_id !== targetProfile.company_id
      ) {
        return new Response(
          JSON.stringify({ error: "Você só pode excluir usuários da sua empresa" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Admins cannot delete master admins
      const { data: targetRoles } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if ((targetRoles ?? []).some((r: { role: string }) => r.role === "master_admin")) {
        return new Response(JSON.stringify({ error: "Permissão negada" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }


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
