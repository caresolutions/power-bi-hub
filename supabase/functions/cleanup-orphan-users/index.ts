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
    const { emails, deleteAll } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get all auth users
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      throw listError;
    }

    // Get all profile IDs
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email");

    const profileIds = new Set(profiles?.map(p => p.id) || []);
    const profileEmails = new Set(profiles?.map(p => p.email.toLowerCase()) || []);

    const deletedUsers: string[] = [];
    const errors: string[] = [];

    for (const authUser of authUsers.users) {
      const userEmail = authUser.email?.toLowerCase() || "";
      
      // Check if user should be deleted:
      // 1. If specific emails provided, check if this user's email is in the list
      // 2. If deleteAll is true, delete all orphan users (not in profiles)
      // 3. Otherwise, skip
      
      let shouldDelete = false;
      
      if (emails && Array.isArray(emails) && emails.length > 0) {
        shouldDelete = emails.map((e: string) => e.toLowerCase()).includes(userEmail);
      } else if (deleteAll) {
        // Delete if user has no profile
        shouldDelete = !profileIds.has(authUser.id);
      }

      if (shouldDelete) {
        try {
          // First clean up any remaining data
          await supabaseAdmin.from("user_dashboard_access").delete().eq("user_id", authUser.id);
          await supabaseAdmin.from("user_group_members").delete().eq("user_id", authUser.id);
          await supabaseAdmin.from("user_dashboard_refresh_permissions").delete().eq("user_id", authUser.id);
          await supabaseAdmin.from("access_log_permissions").delete().eq("user_id", authUser.id);
          await supabaseAdmin.from("user_dashboard_favorites").delete().eq("user_id", authUser.id);
          await supabaseAdmin.from("user_dashboard_bookmarks").delete().eq("user_id", authUser.id);
          await supabaseAdmin.from("support_messages").delete().eq("user_id", authUser.id);
          await supabaseAdmin.from("privacy_consent_records").delete().eq("user_id", authUser.id);
          await supabaseAdmin.from("onboarding_progress").delete().eq("user_id", authUser.id);
          await supabaseAdmin.from("subscriptions").delete().eq("user_id", authUser.id);
          await supabaseAdmin.from("user_roles").delete().eq("user_id", authUser.id);
          await supabaseAdmin.from("profiles").delete().eq("id", authUser.id);
          await supabaseAdmin.from("user_invitations").delete().eq("email", userEmail);

          // Delete from auth
          const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(authUser.id);
          
          if (deleteError) {
            errors.push(`${userEmail}: ${deleteError.message}`);
          } else {
            deletedUsers.push(userEmail);
            console.log(`Deleted user: ${userEmail} (${authUser.id})`);
          }
        } catch (err: any) {
          errors.push(`${userEmail}: ${err.message}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `${deletedUsers.length} usuário(s) excluído(s)`,
        deletedUsers,
        errors: errors.length > 0 ? errors : undefined,
        totalAuthUsers: authUsers.users.length,
        totalProfiles: profiles?.length || 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in cleanup-orphan-users:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
