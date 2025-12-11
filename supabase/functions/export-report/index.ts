import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAILJET_API_KEY = Deno.env.get('MAILJET_API_KEY');
const MAILJET_SECRET_KEY = Deno.env.get('MAILJET_SECRET_KEY');
const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY');

interface ExportRequest {
  subscriptionId: string;
}

// Decryption function for encrypted credentials
async function decryptValue(ciphertext: string, keyString: string): Promise<string> {
  try {
    const keyData = Uint8Array.from(atob(keyString), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt credential');
  }
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
          credential_id,
          power_bi_configs (
            client_id,
            client_secret,
            tenant_id,
            username,
            password
          )
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
    const credentials = dashboard?.power_bi_configs;

    if (!credentials) {
      throw new Error('Power BI credentials not configured for this dashboard');
    }

    // Decrypt sensitive credentials
    let decryptedClientSecret = credentials.client_secret;
    let decryptedPassword = credentials.password || '';

    if (ENCRYPTION_KEY) {
      console.log('Decrypting credentials...');
      try {
        if (credentials.client_secret) {
          decryptedClientSecret = await decryptValue(credentials.client_secret, ENCRYPTION_KEY);
        }
        if (credentials.password) {
          decryptedPassword = await decryptValue(credentials.password, ENCRYPTION_KEY);
        }
        console.log('Credentials decrypted successfully');
      } catch (decryptError) {
        console.error('Failed to decrypt credentials:', decryptError);
        throw new Error('Failed to decrypt Power BI credentials');
      }
    } else {
      console.warn('ENCRYPTION_KEY not set, using credentials as-is');
    }

    // Get Power BI access token
    console.log('Getting Power BI access token...');
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${credentials.tenant_id}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: credentials.client_id,
          client_secret: decryptedClientSecret,
          scope: 'https://analysis.windows.net/powerbi/api/.default',
          username: credentials.username || '',
          password: decryptedPassword,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token error:', errorText);
      throw new Error(`Failed to get Power BI token: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Start export job
    console.log('Starting export job...');
    const exportFormat = subscription.export_format === 'pptx' ? 'PPTX' : 'PDF';
    
    const exportBody: Record<string, unknown> = {
      format: exportFormat,
    };

    // Add specific page if configured
    if (subscription.report_page) {
      exportBody.pages = [{ pageName: subscription.report_page }];
    }

    const exportResponse = await fetch(
      `https://api.powerbi.com/v1.0/myorg/groups/${dashboard.workspace_id}/reports/${dashboard.dashboard_id}/ExportTo`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportBody),
      }
    );

    if (!exportResponse.ok) {
      const errorText = await exportResponse.text();
      console.error('Export start error:', errorText);
      throw new Error(`Failed to start export: ${errorText}`);
    }

    const exportData = await exportResponse.json();
    const exportId = exportData.id;
    console.log(`Export started with ID: ${exportId}`);

    // Poll for export completion (max 5 minutes)
    let exportStatus = 'Running';
    let fileUrl = '';
    const maxAttempts = 30;
    let attempts = 0;

    while (exportStatus === 'Running' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      attempts++;

      const statusResponse = await fetch(
        `https://api.powerbi.com/v1.0/myorg/groups/${dashboard.workspace_id}/reports/${dashboard.dashboard_id}/exports/${exportId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!statusResponse.ok) {
        console.error('Status check failed');
        continue;
      }

      const statusData = await statusResponse.json();
      exportStatus = statusData.status;
      console.log(`Export status: ${exportStatus} (attempt ${attempts})`);

      if (exportStatus === 'Succeeded') {
        fileUrl = statusData.resourceLocation;
      } else if (exportStatus === 'Failed') {
        throw new Error('Export failed: ' + (statusData.error?.message || 'Unknown error'));
      }
    }

    if (exportStatus !== 'Succeeded') {
      throw new Error('Export timed out');
    }

    // Download the exported file
    console.log('Downloading exported file...');
    const fileResponse = await fetch(fileUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!fileResponse.ok) {
      throw new Error('Failed to download exported file');
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const base64File = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
    
    const fileExtension = subscription.export_format === 'pptx' ? 'pptx' : 'pdf';
    const mimeType = subscription.export_format === 'pptx' 
      ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      : 'application/pdf';
    const fileName = `${dashboard.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.${fileExtension}`;

    // Send email to all recipients
    console.log(`Sending email to ${recipients.length} recipients...`);
    
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
          Subject: `Relatório: ${dashboard.name}`,
          HTMLPart: `
            <h2>Relatório Power BI</h2>
            <p>Olá${recipient.name ? ` ${recipient.name}` : ''},</p>
            <p>Segue em anexo o relatório <strong>${dashboard.name}</strong> conforme programado.</p>
            <p>Este é um envio automático configurado no Care BI.</p>
            <br>
            <p>Atenciosamente,<br>Care BI</p>
          `,
          Attachments: [{
            ContentType: mimeType,
            Filename: fileName,
            Base64Content: base64File
          }]
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

    console.log('Export and send completed successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Report sent successfully' }),
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
