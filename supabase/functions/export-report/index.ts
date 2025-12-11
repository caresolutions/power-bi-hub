import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAILJET_API_KEY = Deno.env.get('MAILJET_API_KEY');
const MAILJET_SECRET_KEY = Deno.env.get('MAILJET_SECRET_KEY');

interface ExportRequest {
  subscriptionId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { subscriptionId }: ExportRequest = await req.json();
    console.log(`Processing subscription: ${subscriptionId}`);

    // Get subscription details
    const { data: subscription, error: subError } = await supabase
      .from('report_subscriptions')
      .select(`
        *,
        dashboards (
          id,
          name,
          workspace_id,
          dashboard_id,
          public_link,
          embed_type
        ),
        companies:company_id (
          name,
          primary_color
        )
      `)
      .eq('id', subscriptionId)
      .single();

    if (subError || !subscription) {
      console.error('Subscription not found:', subError);
      throw new Error('Subscription not found');
    }

    // Create log entry
    const { data: logEntry } = await supabase
      .from('subscription_logs')
      .insert({
        subscription_id: subscriptionId,
        status: 'sending',
      })
      .select()
      .single();

    // Get recipients
    const { data: recipients } = await supabase
      .from('subscription_recipients')
      .select('*')
      .eq('subscription_id', subscriptionId);

    if (!recipients || recipients.length === 0) {
      throw new Error('No recipients configured');
    }

    const dashboard = subscription.dashboards;
    const company = subscription.companies;

    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    // Build dashboard link - use app URL with dashboard viewer
    const appBaseUrl = 'https://28dee854-2d52-4030-99a6-3f96767762b3.lovableproject.com';
    const dashboardLink = `${appBaseUrl}/dashboard/${dashboard.id}`;
    
    // Also include Power BI direct link if available
    let powerBiDirectLink = '';
    if (dashboard.embed_type === 'public_link' && dashboard.public_link) {
      powerBiDirectLink = dashboard.public_link;
    } else {
      powerBiDirectLink = `https://app.powerbi.com/groups/${dashboard.workspace_id}/reports/${dashboard.dashboard_id}`;
    }

    const primaryColor = company?.primary_color || '#0891b2';
    const companyName = company?.name || 'Care BI';

    // Send email to all recipients with link
    console.log(`Sending email with dashboard link to ${recipients.length} recipients...`);
    
    for (const recipient of recipients) {
      const emailPayload = {
        Messages: [{
          From: {
            Email: "websolution@care-br.com",
            Name: "Care BI"
          },
          To: [{
            Email: recipient.email,
            Name: recipient.name || recipient.email
          }],
          Subject: `📊 Relatório: ${dashboard.name}`,
          HTMLPart: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
                <tr>
                  <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                      <!-- Header -->
                      <tr>
                        <td style="background: linear-gradient(135deg, ${primaryColor} 0%, #0e7490 100%); padding: 30px 40px; text-align: center;">
                          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
                            ${companyName}
                          </h1>
                        </td>
                      </tr>
                      
                      <!-- Content -->
                      <tr>
                        <td style="padding: 40px;">
                          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                            Olá${recipient.name ? ` <strong>${recipient.name}</strong>` : ''},
                          </p>
                          
                          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                            Seu relatório <strong>"${dashboard.name}"</strong> está disponível para visualização.
                          </p>
                          
                          <!-- Dashboard Card -->
                          <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%); border-radius: 8px; margin-bottom: 30px;">
                            <tr>
                              <td style="padding: 25px;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td>
                                      <p style="color: #0891b2; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">
                                        📊 Dashboard
                                      </p>
                                      <p style="color: #0f172a; font-size: 20px; font-weight: 600; margin: 0;">
                                        ${dashboard.name}
                                      </p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- CTA Button -->
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td align="center" style="padding-bottom: 20px;">
                                <a href="${dashboardLink}" 
                                   style="display: inline-block; background: linear-gradient(135deg, ${primaryColor} 0%, #0e7490 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(8, 145, 178, 0.4);">
                                  Abrir Dashboard
                                </a>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Alternative Link -->
                          <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 0 0 10px 0;">
                            Ou acesse diretamente no Power BI:
                          </p>
                          <p style="text-align: center; margin: 0 0 30px 0;">
                            <a href="${powerBiDirectLink}" style="color: ${primaryColor}; font-size: 14px; word-break: break-all;">
                              ${powerBiDirectLink}
                            </a>
                          </p>
                          
                          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                          
                          <p style="color: #9ca3af; font-size: 13px; line-height: 1.5; margin: 0;">
                            Este é um envio automático configurado no ${companyName}. 
                            Se você não reconhece este email, por favor ignore-o.
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #f9fafb; padding: 20px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                            © ${new Date().getFullYear()} ${companyName}. Todos os direitos reservados.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `,
          TextPart: `
Olá${recipient.name ? ` ${recipient.name}` : ''},

Seu relatório "${dashboard.name}" está disponível para visualização.

Acesse o dashboard: ${dashboardLink}

Ou acesse diretamente no Power BI: ${powerBiDirectLink}

Este é um envio automático configurado no ${companyName}.

Atenciosamente,
${companyName}
          `
        }]
      };

      const mailResponse = await fetch('https://api.mailjet.com/v3.1/send', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
      });

      if (!mailResponse.ok) {
        const mailError = await mailResponse.text();
        console.error(`Failed to send email to ${recipient.email}:`, mailError);
      } else {
        console.log(`Email sent to ${recipient.email}`);
      }
    }

    // Update log entry
    await supabase
      .from('subscription_logs')
      .update({
        status: 'sent',
        completed_at: new Date().toISOString(),
        recipients_count: recipients.length,
      })
      .eq('id', logEntry?.id);

    // Update subscription last_sent_at
    await supabase
      .from('report_subscriptions')
      .update({
        last_sent_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId);

    console.log('Email with dashboard link sent successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Report link sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in export-report function:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
