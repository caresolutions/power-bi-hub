import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SUBSCRIPTION-ALERTS] ${step}${detailsStr}`);
};

const getEmailTemplate = (content: string, ctaUrl?: string, ctaText?: string): string => {
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
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Care BI</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
              ${ctaUrl ? `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 30px;">
                <tr>
                  <td align="center">
                    <a href="${ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">${ctaText || 'Acessar'}</a>
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>
          <!-- Footer -->
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

const sendEmail = async (to: string, toName: string, subject: string, htmlContent: string) => {
  if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) {
    throw new Error("Mailjet credentials not configured");
  }

  const authString = btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`);

  const response = await fetch("https://api.mailjet.com/v3.1/send", {
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
              Email: to,
              Name: toName || to,
            },
          ],
          Subject: subject,
          TextPart: subject,
          HTMLPart: htmlContent,
        },
      ],
    }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.ErrorMessage || "Failed to send email");
  }
  return result;
};

interface AlertRequest {
  type: "trial_expiring" | "payment_failed";
  userId?: string;
  email?: string;
  userName?: string;
  daysRemaining?: number;
  failureReason?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check if this is a cron job (no body) or manual trigger
    let alertRequests: AlertRequest[] = [];
    
    const contentType = req.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const body = await req.json();
      if (body.type) {
        alertRequests = [body];
      }
    }

    // If no specific request, check for trials expiring soon
    if (alertRequests.length === 0) {
      logStep("Running scheduled check for expiring trials");
      
      // Find trials expiring in 3 days, 1 day, or today
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
      
      // Get trial subscriptions
      const { data: trialSubs, error: trialError } = await supabaseClient
        .from("subscriptions")
        .select(`
          id,
          user_id,
          status,
          current_period_end,
          is_master_managed
        `)
        .eq("status", "trial")
        .eq("is_master_managed", false)
        .not("current_period_end", "is", null);

      if (trialError) {
        logStep("Error fetching trial subscriptions", { error: trialError.message });
        throw trialError;
      }

      logStep("Found trial subscriptions", { count: trialSubs?.length || 0 });

      for (const sub of trialSubs || []) {
        const endDate = new Date(sub.current_period_end);
        const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        
        // Only send for 3 days, 1 day, or 0 days remaining
        if (daysRemaining !== 3 && daysRemaining !== 1 && daysRemaining !== 0) {
          continue;
        }

        const notificationType = `trial_expiring_${daysRemaining}d`;
        
        // Check if we already sent this notification
        const { data: existingNotif } = await supabaseClient
          .from("notification_logs")
          .select("id")
          .eq("user_id", sub.user_id)
          .eq("notification_type", notificationType)
          .gte("sent_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
          .single();

        if (existingNotif) {
          logStep("Notification already sent", { userId: sub.user_id, type: notificationType });
          continue;
        }

        // Get user email
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("email, full_name")
          .eq("id", sub.user_id)
          .single();

        if (!profile?.email) {
          logStep("No email found for user", { userId: sub.user_id });
          continue;
        }

        alertRequests.push({
          type: "trial_expiring",
          userId: sub.user_id,
          email: profile.email,
          userName: profile.full_name || profile.email,
          daysRemaining,
        });
      }
    }

    logStep("Processing alert requests", { count: alertRequests.length });

    const results = [];
    const appUrl = "https://dashboards.care-br.com";

    for (const alert of alertRequests) {
      try {
        let subject: string;
        let content: string;
        let ctaUrl: string;
        let ctaText: string;

        if (alert.type === "trial_expiring") {
          const daysText = alert.daysRemaining === 0 
            ? "Seu período de trial expira hoje!"
            : alert.daysRemaining === 1 
              ? "Seu período de trial expira amanhã!"
              : `Seu período de trial expira em ${alert.daysRemaining} dias`;

          subject = `⚠️ ${daysText} - Care BI`;
          content = `
            <h2 style="color: #1e293b; font-size: 24px; margin: 0 0 20px 0;">Olá${alert.userName ? `, ${alert.userName.split(' ')[0]}` : ''}!</h2>
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
              ${daysText}
            </p>
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
              Para continuar aproveitando todos os recursos do Care BI sem interrupções, assine agora um de nossos planos.
            </p>
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #92400e; font-size: 14px; margin: 0;">
                <strong>Importante:</strong> Após o término do trial, o acesso aos dashboards será bloqueado até a ativação de uma assinatura.
              </p>
            </div>
          `;
          ctaUrl = `${appUrl}/subscription`;
          ctaText = "Ver Planos";
        } else if (alert.type === "payment_failed") {
          subject = "❌ Falha no pagamento - Care BI";
          content = `
            <h2 style="color: #1e293b; font-size: 24px; margin: 0 0 20px 0;">Olá${alert.userName ? `, ${alert.userName.split(' ')[0]}` : ''}!</h2>
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
              Infelizmente não conseguimos processar o pagamento da sua assinatura.
            </p>
            ${alert.failureReason ? `
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
              <strong>Motivo:</strong> ${alert.failureReason}
            </p>
            ` : ''}
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
              Para evitar a interrupção do serviço, por favor atualize seus dados de pagamento.
            </p>
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #991b1b; font-size: 14px; margin: 0;">
                <strong>Atenção:</strong> Após múltiplas tentativas de cobrança falhadas, sua assinatura poderá ser cancelada automaticamente.
              </p>
            </div>
          `;
          ctaUrl = `${appUrl}/subscription`;
          ctaText = "Atualizar Pagamento";
        } else {
          continue;
        }

        const htmlContent = getEmailTemplate(content, ctaUrl, ctaText);
        
        await sendEmail(alert.email!, alert.userName || alert.email!, subject, htmlContent);
        logStep("Email sent successfully", { email: alert.email, type: alert.type });

        // Log the notification
        if (alert.userId) {
          const notificationType = alert.type === "trial_expiring" 
            ? `trial_expiring_${alert.daysRemaining}d` 
            : "payment_failed";
          
          await supabaseClient
            .from("notification_logs")
            .insert({
              user_id: alert.userId,
              notification_type: notificationType,
              metadata: { daysRemaining: alert.daysRemaining, failureReason: alert.failureReason },
            });
        }

        results.push({ success: true, email: alert.email, type: alert.type });
      } catch (emailError: any) {
        logStep("Error sending email", { email: alert.email, error: emailError.message });
        results.push({ success: false, email: alert.email, type: alert.type, error: emailError.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: alertRequests.length,
        results 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
