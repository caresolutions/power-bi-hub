import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

function generateSecurePassword(): string {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const special = "@#$%&*!";
  const allChars = uppercase + lowercase + numbers + special;
  
  let password = "";
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  for (let i = 0; i < 8; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

const getEmailTemplate = (content: string): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Care BI</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Open Sans', Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Care BI</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #64748b; font-size: 14px;">
                © ${new Date().getFullYear()} Care BI. Todos os direitos reservados.
              </p>
              <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 12px;">
                Este e-mail foi enviado automaticamente. Por favor, não responda.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { targetUserId } = await req.json();

    if (!targetUserId) {
      throw new Error("targetUserId is required");
    }

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get the calling user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) throw new Error("Invalid authentication");

    // Check caller role
    const { data: isMaster } = await supabaseAdmin.rpc("is_master_admin", { _user_id: caller.id });
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: caller.id, _role: "admin" });

    if (!isMaster && !isAdmin) {
      throw new Error("Permission denied: only Admin or Master Admin can reset passwords");
    }

    // If admin (not master), verify target user belongs to same company
    if (!isMaster) {
      const { data: callerProfile } = await supabaseAdmin
        .from("profiles")
        .select("company_id")
        .eq("id", caller.id)
        .single();

      const { data: targetProfile } = await supabaseAdmin
        .from("profiles")
        .select("company_id")
        .eq("id", targetUserId)
        .single();

      if (!callerProfile?.company_id || !targetProfile?.company_id || 
          callerProfile.company_id !== targetProfile.company_id) {
        throw new Error("Permission denied: user does not belong to your company");
      }
    }

    // Get target user email
    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("id", targetUserId)
      .single();

    if (!targetProfile) throw new Error("User not found");

    // Generate new password
    const newPassword = generateSecurePassword();

    // Update user password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      throw new Error("Failed to update password");
    }

    // Set must_change_password flag
    await supabaseAdmin
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", targetUserId);

    // Send email with new password
    if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) {
      throw new Error("Mailjet credentials not configured");
    }

    const emailContent = `
      <h2 style="color: #0891b2; margin-bottom: 24px;">Nova Senha Gerada</h2>
      <p style="color: #334155; font-size: 16px; line-height: 1.6;">
        Olá${targetProfile.full_name ? ` ${targetProfile.full_name}` : ''},
      </p>
      <p style="color: #334155; font-size: 16px; line-height: 1.6;">
        Uma nova senha foi gerada para sua conta Care BI pelo administrador.
      </p>
      <div style="background-color: #f0fdfa; border: 2px solid #0891b2; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
        <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">Sua nova senha temporária:</p>
        <p style="margin: 0; color: #0891b2; font-size: 24px; font-weight: 700; letter-spacing: 2px; font-family: monospace;">${newPassword}</p>
      </div>
      <p style="color: #dc2626; font-size: 14px; line-height: 1.6;">
        <strong>Importante:</strong> Você será solicitado a alterar esta senha no próximo login.
      </p>
    `;

    const authString = btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`);

    const mailjetResponse = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${authString}`,
      },
      body: JSON.stringify({
        Messages: [{
          From: { Email: "websolution@care-br.com", Name: "Care BI" },
          To: [{ Email: targetProfile.email, Name: targetProfile.full_name || targetProfile.email }],
          Subject: "Nova Senha - Care BI",
          TextPart: `Sua nova senha temporária: ${newPassword}`,
          HTMLPart: getEmailTemplate(emailContent),
        }],
      }),
    });

    if (!mailjetResponse.ok) {
      const result = await mailjetResponse.json();
      console.error("Mailjet error:", result);
      throw new Error("Failed to send email");
    }

    console.log(`Password reset for user ${targetUserId} by ${caller.id}`);

    return new Response(
      JSON.stringify({ success: true, message: "Nova senha enviada por e-mail com sucesso" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in reset-user-password:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
