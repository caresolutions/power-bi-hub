import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
  redirectUrl: string;
}

const getEmailTemplate = (content: string, ctaUrl: string, ctaText: string): string => {
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
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 30px;">
                <tr>
                  <td align="center">
                    <a href="${ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">${ctaText}</a>
                  </td>
                </tr>
              </table>
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
</html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-password-reset function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) {
      console.error("Mailjet credentials not configured");
      throw new Error("Mailjet credentials not configured");
    }

    const { email, redirectUrl }: PasswordResetRequest = await req.json();

    if (!email) {
      throw new Error("E-mail é obrigatório");
    }

    console.log(`Processing password reset for: ${email}`);

    // Create Supabase admin client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Generate password reset link using Supabase Admin API
    const { data, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: email,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (resetError) {
      console.error("Error generating reset link:", resetError);
      // Don't reveal if email exists or not for security
      return new Response(
        JSON.stringify({ success: true, message: "Se o e-mail existir, você receberá um link de recuperação." }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resetLink = data.properties?.action_link;
    
    if (!resetLink) {
      console.error("No reset link generated");
      throw new Error("Erro ao gerar link de recuperação");
    }

    console.log("Reset link generated successfully");

    // Send email via Mailjet
    const emailContent = `
      <h2 style="color: #0891b2; margin-bottom: 24px;">Recuperação de Senha</h2>
      <p style="color: #334155; font-size: 16px; line-height: 1.6;">
        Recebemos uma solicitação para redefinir a senha da sua conta Care BI.
      </p>
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-top: 16px;">
        Clique no botão abaixo para criar uma nova senha:
      </p>
      <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin-top: 24px;">
        <strong>Importante:</strong> Este link expira em 24 horas. Se você não solicitou a redefinição de senha, ignore este e-mail.
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
        Messages: [
          {
            From: {
              Email: "websolution@care-br.com",
              Name: "Care BI",
            },
            To: [
              {
                Email: email,
                Name: email,
              },
            ],
            Subject: "Recuperação de Senha - Care BI",
            TextPart: "Clique no link para redefinir sua senha",
            HTMLPart: getEmailTemplate(emailContent, resetLink, "Redefinir Senha"),
          },
        ],
      }),
    });

    const mailjetResult = await mailjetResponse.json();
    console.log("Mailjet response:", JSON.stringify(mailjetResult));

    if (!mailjetResponse.ok) {
      console.error("Mailjet API error:", mailjetResult);
      throw new Error("Erro ao enviar e-mail de recuperação");
    }

    return new Response(
      JSON.stringify({ success: true, message: "E-mail de recuperação enviado com sucesso!" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in password reset:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
