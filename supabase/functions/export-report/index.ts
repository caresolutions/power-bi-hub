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

interface PowerBIConfig {
  client_id: string;
  client_secret: string;
  tenant_id: string;
  username: string;
  password: string;
}

// Decrypt function for encrypted credentials
async function decryptValue(ciphertext: string, keyString: string): Promise<string> {
  if (!ciphertext) return "";
  
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(keyString.padEnd(32, '0').slice(0, 32));
    
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );
    
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
    console.error("Decryption failed - returning as-is for backward compatibility");
    return ciphertext;
  }
}

// Master User authentication using ROPC flow
async function getAzureAccessToken(config: PowerBIConfig): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${config.tenant_id}/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    grant_type: "password",
    client_id: config.client_id,
    client_secret: config.client_secret,
    scope: "https://analysis.windows.net/powerbi/api/.default",
    username: config.username,
    password: config.password,
  });

  console.log("Requesting Azure AD token for export...");

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Azure AD token error:", errorText);
    throw new Error(`Failed to get Azure AD token: ${response.status}`);
  }

  const data = await response.json();
  console.log("Azure AD token obtained successfully");
  return data.access_token;
}

// Export report to PNG using Power BI Export API
async function exportReportToPNG(
  accessToken: string,
  workspaceId: string,
  reportId: string,
  pageName?: string
): Promise<string> {
  console.log(`Starting PNG export for report: ${reportId} in workspace: ${workspaceId}`);

  // Step 1: Start the export
  const exportUrl = `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports/${reportId}/ExportTo`;
  
  const exportBody: any = {
    format: "PNG"
  };

  // If a specific page is requested, add it
  if (pageName) {
    exportBody.powerBIReportConfiguration = {
      pages: [{ pageName }]
    };
  }

  console.log("Initiating export request...");
  const exportResponse = await fetch(exportUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(exportBody),
  });

  if (!exportResponse.ok) {
    const errorText = await exportResponse.text();
    console.error("Export initiation error:", errorText);
    throw new Error(`Failed to initiate export: ${exportResponse.status} - ${errorText}`);
  }

  const exportData = await exportResponse.json();
  const exportId = exportData.id;
  console.log(`Export initiated with ID: ${exportId}`);

  // Step 2: Poll for export completion
  const statusUrl = `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports/${reportId}/exports/${exportId}`;
  
  const maxAttempts = 60; // Max 5 minutes (60 * 5 seconds)
  let attempts = 0;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    attempts++;

    console.log(`Polling export status (attempt ${attempts})...`);
    
    const statusResponse = await fetch(statusUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error("Status check error:", errorText);
      throw new Error(`Failed to check export status: ${statusResponse.status}`);
    }

    const statusData = await statusResponse.json();
    console.log(`Export status: ${statusData.status}, progress: ${statusData.percentComplete}%`);

    if (statusData.status === "Succeeded") {
      console.log("Export completed successfully!");
      
      // Step 3: Download the file
      const fileUrl = `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports/${reportId}/exports/${exportId}/file`;
      
      const fileResponse = await fetch(fileUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!fileResponse.ok) {
        throw new Error(`Failed to download export file: ${fileResponse.status}`);
      }

      const arrayBuffer = await fileResponse.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      console.log(`Downloaded PNG file, size: ${arrayBuffer.byteLength} bytes`);
      return base64;
    }

    if (statusData.status === "Failed") {
      throw new Error(`Export failed: ${statusData.error?.message || 'Unknown error'}`);
    }
  }

  throw new Error("Export timed out after 5 minutes");
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

    // Get subscription details with credential info
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
          embed_type,
          credential_id,
          report_section
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
        status: 'exporting',
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

    const primaryColor = company?.primary_color || '#0891b2';
    const companyName = company?.name || 'Care BI';

    let imageBase64: string | null = null;
    let exportSuccess = false;

    // Try to export as PNG if credential is available
    if (dashboard.credential_id && dashboard.embed_type !== 'public_link') {
      try {
        console.log('Attempting to export report as PNG...');
        
        // Get credential
        const { data: credData, error: credError } = await supabase
          .from('power_bi_configs')
          .select('client_id, client_secret, tenant_id, username, password')
          .eq('id', dashboard.credential_id)
          .single();

        if (credError || !credData) {
          throw new Error('Credential not found');
        }

        // Decrypt credentials if encryption key exists
        const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
        let credential: PowerBIConfig;

        if (encryptionKey) {
          credential = {
            client_id: credData.client_id,
            client_secret: await decryptValue(credData.client_secret, encryptionKey),
            tenant_id: credData.tenant_id,
            username: credData.username,
            password: await decryptValue(credData.password || "", encryptionKey),
          };
        } else {
          credential = credData as PowerBIConfig;
        }

        // Get access token
        const accessToken = await getAzureAccessToken(credential);

        // Export to PNG
        imageBase64 = await exportReportToPNG(
          accessToken,
          dashboard.workspace_id,
          dashboard.dashboard_id,
          subscription.report_page || dashboard.report_section
        );

        exportSuccess = true;
        console.log('PNG export successful!');

      } catch (exportError: any) {
        console.error('PNG export failed, falling back to link:', exportError.message);
        exportSuccess = false;
      }
    }

    // Build dashboard link for fallback or alternative access
    const appBaseUrl = 'https://28dee854-2d52-4030-99a6-3f96767762b3.lovableproject.com';
    const dashboardLink = `${appBaseUrl}/dashboard/${dashboard.id}`;
    
    let powerBiDirectLink = '';
    if (dashboard.embed_type === 'public_link' && dashboard.public_link) {
      powerBiDirectLink = dashboard.public_link;
    } else {
      powerBiDirectLink = `https://app.powerbi.com/groups/${dashboard.workspace_id}/reports/${dashboard.dashboard_id}`;
    }

    // Send email to all recipients
    console.log(`Sending email to ${recipients.length} recipients...`);
    
    for (const recipient of recipients) {
      let emailHtml: string;

      if (exportSuccess && imageBase64) {
        // Email with embedded image
        emailHtml = `
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
                  <table width="800" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
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
                          Segue a captura do seu relatório <strong>"${dashboard.name}"</strong>:
                        </p>
                        
                        <!-- Report Image -->
                        <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 30px; text-align: center;">
                          <img src="cid:report-image" alt="${dashboard.name}" style="max-width: 100%; height: auto; border-radius: 4px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);" />
                        </div>
                        
                        <!-- CTA Button -->
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" style="padding-bottom: 20px;">
                              <a href="${dashboardLink}" 
                                 style="display: inline-block; background: linear-gradient(135deg, ${primaryColor} 0%, #0e7490 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(8, 145, 178, 0.4);">
                                Abrir Dashboard Interativo
                              </a>
                            </td>
                          </tr>
                        </table>
                        
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
        `;
      } else {
        // Email with link only (fallback)
        emailHtml = `
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
        `;
      }

      // Build email payload
      const emailPayload: any = {
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
          HTMLPart: emailHtml,
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

      // Add inline attachment if image exists
      if (exportSuccess && imageBase64) {
        emailPayload.Messages[0].InlinedAttachments = [{
          ContentType: "image/png",
          Filename: "report.png",
          ContentID: "report-image",
          Base64Content: imageBase64
        }];
      }

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
        status: exportSuccess ? 'sent_with_image' : 'sent_with_link',
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

    const message = exportSuccess 
      ? 'Report image sent successfully' 
      : 'Report link sent successfully (image export not available)';
    
    console.log(message);

    return new Response(
      JSON.stringify({ success: true, message, exportedAsImage: exportSuccess }),
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
