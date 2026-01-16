import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple AES-GCM encryption using Web Crypto API
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyString = Deno.env.get("ENCRYPTION_KEY");
  if (!keyString) {
    throw new Error("Encryption key not configured");
  }
  
  // Create a key from the secret
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyString.padEnd(32, '0').slice(0, 32));
  
  return await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encrypt(plaintext: string): Promise<string> {
  if (!plaintext) return "";
  
  const key = await getEncryptionKey();
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext)
  );
  
  // Combine IV and ciphertext, then base64 encode
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(ciphertext: string): Promise<string> {
  if (!ciphertext) return "";
  
  try {
    const key = await getEncryptionKey();
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error("Decryption failed - data may not be encrypted or key mismatch");
    // Return as-is if decryption fails (for backward compatibility with unencrypted data)
    return ciphertext;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { action, data } = await req.json();

    if (action === "create") {
      // Check if user is master_admin
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      
      const isMasterAdmin = roleData?.some(r => r.role === "master_admin");
      
      let targetCompanyId = data.company_id;
      
      if (!isMasterAdmin && !targetCompanyId) {
        // Regular admin without company_id in request: try to get from profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("id", user.id)
          .single();

        if (profile?.company_id) {
          targetCompanyId = profile.company_id;
        }
        // If still no company_id, allow null (credential will be associated when company is created)
      }
      // For master admin: company_id can be null (global credential) or specific company

      // Encrypt sensitive fields before storing
      const encryptedClientSecret = await encrypt(data.client_secret);
      const encryptedPassword = data.password ? await encrypt(data.password) : null;

      const { data: result, error } = await supabase
        .from("power_bi_configs")
        .insert({
          user_id: user.id,
          name: data.name,
          client_id: data.client_id,
          client_secret: encryptedClientSecret,
          tenant_id: data.tenant_id,
          username: data.username,
          password: encryptedPassword,
          company_id: targetCompanyId || null,
        })
        .select("id, name, client_id, tenant_id, username, created_at")
        .single();

      if (error) throw error;

      console.log("Credential created successfully:", result.id);
      return new Response(JSON.stringify({ success: true, data: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      // Check if user is master_admin
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      
      const isMasterAdmin = roleData?.some(r => r.role === "master_admin");
      
      // First verify ownership or master admin
      const { data: existing } = await supabase
        .from("power_bi_configs")
        .select("user_id")
        .eq("id", data.id)
        .single();

      if (!existing || (!isMasterAdmin && existing.user_id !== user.id)) {
        throw new Error("Credential not found or access denied");
      }

      const updateData: Record<string, string | null> = {
        name: data.name,
        client_id: data.client_id,
        tenant_id: data.tenant_id,
        username: data.username,
      };

      // Allow master admin to update company_id
      if (isMasterAdmin && data.company_id !== undefined) {
        updateData.company_id = data.company_id || null;
      }

      // Only update secrets if provided (encrypt them)
      if (data.client_secret) {
        updateData.client_secret = await encrypt(data.client_secret);
      }
      if (data.password) {
        updateData.password = await encrypt(data.password);
      }

      const { error } = await supabase
        .from("power_bi_configs")
        .update(updateData)
        .eq("id", data.id);

      if (error) throw error;

      console.log("Credential updated successfully:", data.id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "decrypt_for_use") {
      // This action is used internally by get-powerbi-embed
      // Verify the credential belongs to a dashboard the user can access
      const { credentialId, dashboardId } = data;

      // Get dashboard to verify access
      const { data: dashboard, error: dashErr } = await supabase
        .from("dashboards")
        .select("owner_id, credential_id")
        .eq("id", dashboardId)
        .single();

      if (dashErr || !dashboard) {
        throw new Error("Dashboard not found");
      }

      // Check if user is owner or has access
      const isOwner = dashboard.owner_id === user.id;
      if (!isOwner) {
        const { data: access } = await supabase
          .from("user_dashboard_access")
          .select("id")
          .eq("dashboard_id", dashboardId)
          .eq("user_id", user.id)
          .single();

        if (!access) {
          throw new Error("Access denied");
        }
      }

      if (dashboard.credential_id !== credentialId) {
        throw new Error("Credential mismatch");
      }

      // Get and decrypt credential
      const { data: credential, error: credErr } = await supabase
        .from("power_bi_configs")
        .select("client_id, client_secret, tenant_id, username, password")
        .eq("id", credentialId)
        .single();

      if (credErr || !credential) {
        throw new Error("Credential not found");
      }

      // Decrypt sensitive fields
      const decryptedCredential = {
        client_id: credential.client_id,
        client_secret: await decrypt(credential.client_secret),
        tenant_id: credential.tenant_id,
        username: credential.username,
        password: await decrypt(credential.password || ""),
      };

      return new Response(JSON.stringify({ success: true, credential: decryptedCredential }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (error: any) {
    console.error("Error in manage-credentials:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});