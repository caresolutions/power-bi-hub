import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a secure random password
function generateSecurePassword(): string {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const special = "@#$%&*!";
  
  const allChars = uppercase + lowercase + numbers + special;
  
  // Ensure at least one of each required type
  let password = "";
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest randomly (total 12 chars)
  for (let i = 0; i < 8; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, companyId, dashboardIds, invitedBy, invitedRole } = await req.json();

    if (!email || !companyId || !invitedBy) {
      throw new Error("Email, companyId and invitedBy are required");
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Generate temporary password
    const temporaryPassword = generateSecurePassword();

    let userId: string;
    let isExistingUser = false;

    // Try to create user with admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        invited_by: invitedBy,
      },
    });

    if (authError) {
      // Check if user already exists in auth
      if (authError.message.includes("already been registered")) {
        console.log("User already exists in auth, checking profile...");
        
        // Find existing user by email
        const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (listError) {
          console.error("Error listing users:", listError);
          throw new Error("Erro ao buscar usuário existente");
        }
        
        const existingUser = existingUsers.users.find(u => u.email === email);
        
        if (!existingUser) {
          throw new Error("Usuário não encontrado");
        }
        
        // Check if user has a profile (meaning they're active in the system)
        const { data: existingProfile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("id", existingUser.id)
          .maybeSingle();
        
        if (existingProfile) {
          // User exists and has profile - treat as existing user
          userId = existingUser.id;
          isExistingUser = true;
          console.log("Found existing user with profile:", userId);
        } else {
          // User exists in auth but no profile - was deleted, so delete from auth and recreate
          console.log("User exists in auth but no profile, deleting from auth to recreate...");
          
          const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
          
          if (deleteError) {
            console.error("Error deleting orphan user:", deleteError);
            throw new Error("Erro ao limpar usuário órfão");
          }
          
          // Now create the user fresh
          const { data: newAuthData, error: newAuthError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: temporaryPassword,
            email_confirm: true,
            user_metadata: {
              invited_by: invitedBy,
            },
          });
          
          if (newAuthError || !newAuthData.user) {
            console.error("Error creating user after cleanup:", newAuthError);
            throw new Error(newAuthError?.message || "Erro ao criar usuário");
          }
          
          userId = newAuthData.user.id;
          console.log("Created new user after cleanup:", userId);
        }
      } else {
        console.error("Error creating user:", authError);
        throw new Error(authError.message);
      }
    } else {
      if (!authData.user) {
        throw new Error("Failed to create user");
      }
      userId = authData.user.id;
    }

    // Update profile with company_id and must_change_password
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ 
        company_id: companyId,
        must_change_password: true 
      })
      .eq("id", userId);

    if (profileError) {
      console.error("Error updating profile:", profileError);
    }

    // Delete any existing roles first (to avoid trigger-added roles)
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    // Assign the correct role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userId,
        role: invitedRole || "user",
      });

    if (roleError) {
      console.error("Error assigning role:", roleError);
    }

    // Grant dashboard access if dashboardIds provided
    if (dashboardIds && dashboardIds.length > 0) {
      const accessEntries = dashboardIds.map((dashboardId: string) => ({
        dashboard_id: dashboardId,
        user_id: userId,
        granted_by: invitedBy,
      }));

      const { error: accessError } = await supabaseAdmin
        .from("user_dashboard_access")
        .insert(accessEntries);

      if (accessError) {
        console.error("Error granting dashboard access:", accessError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        userId,
        temporaryPassword: isExistingUser ? null : temporaryPassword,
        isExistingUser,
        message: isExistingUser 
          ? "Usuário existente adicionado à empresa com sucesso" 
          : "Novo usuário criado com sucesso",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in create-invited-user:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
