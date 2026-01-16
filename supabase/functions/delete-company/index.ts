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
    const { companyId, deleteUsers } = await req.json();

    if (!companyId) {
      throw new Error("companyId is required");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get all users from this company
    const { data: companyUsers } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("company_id", companyId);

    const userIds = companyUsers?.map(u => u.id) || [];

    console.log(`Deleting company ${companyId} with ${userIds.length} users`);

    // Delete all related data for users
    for (const userId of userIds) {
      // Delete user dashboard access
      await supabaseAdmin
        .from("user_dashboard_access")
        .delete()
        .eq("user_id", userId);

      // Delete user group memberships
      await supabaseAdmin
        .from("user_group_members")
        .delete()
        .eq("user_id", userId);

      // Delete refresh permissions
      await supabaseAdmin
        .from("user_dashboard_refresh_permissions")
        .delete()
        .eq("user_id", userId);

      // Delete access log permissions
      await supabaseAdmin
        .from("access_log_permissions")
        .delete()
        .eq("user_id", userId);

      // Delete dashboard favorites
      await supabaseAdmin
        .from("user_dashboard_favorites")
        .delete()
        .eq("user_id", userId);

      // Delete dashboard bookmarks
      await supabaseAdmin
        .from("user_dashboard_bookmarks")
        .delete()
        .eq("user_id", userId);

      // Delete support messages
      await supabaseAdmin
        .from("support_messages")
        .delete()
        .eq("user_id", userId);

      // Delete privacy consent records
      await supabaseAdmin
        .from("privacy_consent_records")
        .delete()
        .eq("user_id", userId);

      // Delete user roles
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
      if (deleteUsers) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(userId);
          console.log(`User ${userId} deleted from auth`);
        } catch (authError) {
          console.error(`Error deleting user ${userId} from auth:`, authError);
        }
      }
    }

    // Delete company-level data
    // Get all dashboards for the company
    const { data: dashboards } = await supabaseAdmin
      .from("dashboards")
      .select("id")
      .eq("company_id", companyId);

    const dashboardIds = dashboards?.map(d => d.id) || [];

    // Delete dashboard-related data
    for (const dashboardId of dashboardIds) {
      await supabaseAdmin
        .from("dashboard_page_visibility")
        .delete()
        .eq("dashboard_id", dashboardId);

      await supabaseAdmin
        .from("dashboard_refresh_history")
        .delete()
        .eq("dashboard_id", dashboardId);

      await supabaseAdmin
        .from("slider_slides")
        .delete()
        .eq("dashboard_id", dashboardId);

      await supabaseAdmin
        .from("group_dashboard_access")
        .delete()
        .eq("dashboard_id", dashboardId);
    }

    // Delete dashboards
    await supabaseAdmin
      .from("dashboards")
      .delete()
      .eq("company_id", companyId);

    // Delete user groups
    const { data: groups } = await supabaseAdmin
      .from("user_groups")
      .select("id")
      .eq("company_id", companyId);

    for (const group of groups || []) {
      await supabaseAdmin
        .from("user_group_members")
        .delete()
        .eq("group_id", group.id);

      await supabaseAdmin
        .from("group_dashboard_access")
        .delete()
        .eq("group_id", group.id);
    }

    await supabaseAdmin
      .from("user_groups")
      .delete()
      .eq("company_id", companyId);

    // Delete report subscriptions and recipients
    const { data: subscriptions } = await supabaseAdmin
      .from("report_subscriptions")
      .select("id")
      .eq("company_id", companyId);

    for (const sub of subscriptions || []) {
      await supabaseAdmin
        .from("subscription_recipients")
        .delete()
        .eq("subscription_id", sub.id);

      await supabaseAdmin
        .from("subscription_logs")
        .delete()
        .eq("subscription_id", sub.id);
    }

    await supabaseAdmin
      .from("report_subscriptions")
      .delete()
      .eq("company_id", companyId);

    // Delete Power BI configs
    await supabaseAdmin
      .from("power_bi_configs")
      .delete()
      .eq("company_id", companyId);

    // Delete credential access
    await supabaseAdmin
      .from("credential_company_access")
      .delete()
      .eq("company_id", companyId);

    // Delete access logs
    await supabaseAdmin
      .from("dashboard_access_logs")
      .delete()
      .eq("company_id", companyId);

    // Delete user invitations
    await supabaseAdmin
      .from("user_invitations")
      .delete()
      .eq("company_id", companyId);

    // Finally, delete the company
    const { error: companyError } = await supabaseAdmin
      .from("companies")
      .delete()
      .eq("id", companyId);

    if (companyError) {
      throw companyError;
    }

    console.log(`Company ${companyId} deleted successfully`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Empresa excluída com sucesso",
        deletedUsers: userIds.length,
        deletedDashboards: dashboardIds.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in delete-company:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
