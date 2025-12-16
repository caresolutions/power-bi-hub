import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64 } = await req.json();

    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ success: false, error: 'PDF base64 é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não está configurada');
    }

    console.log('Analisando brandbook com IA...');

    // Use Lovable AI with vision to analyze the PDF
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em análise de brandbooks e identidade visual. Analise o documento fornecido e extraia as informações de branding.

IMPORTANTE: Responda APENAS com um JSON válido, sem markdown, sem explicações. O JSON deve seguir este formato exato:

{
  "primary_color": "#XXXXXX",
  "secondary_color": "#XXXXXX",
  "accent_color": "#XXXXXX",
  "background_color": "#XXXXXX",
  "foreground_color": "#XXXXXX",
  "muted_color": "#XXXXXX",
  "destructive_color": "#XXXXXX",
  "success_color": "#XXXXXX",
  "card_color": "#XXXXXX",
  "border_color": "#XXXXXX",
  "fonts": {
    "primary": "Nome da fonte principal",
    "secondary": "Nome da fonte secundária"
  },
  "confidence": "high" | "medium" | "low"
}

Regras para extração:
1. primary_color: Cor principal da marca (mais predominante)
2. secondary_color: Cor secundária de destaque
3. accent_color: Cor de acento para botões e interações
4. background_color: Cor de fundo clara (geralmente branco ou cinza claro)
5. foreground_color: Cor do texto principal (geralmente preto ou cinza escuro)
6. muted_color: Cor para elementos desabilitados ou secundários
7. destructive_color: Cor para ações destrutivas (geralmente vermelho)
8. success_color: Cor para sucesso (geralmente verde)
9. card_color: Cor de fundo para cards (geralmente branco)
10. border_color: Cor para bordas (geralmente cinza)

Se não encontrar uma cor específica, derive-a logicamente das cores encontradas.
Todas as cores devem ser em formato hexadecimal (#XXXXXX).`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analise este brandbook/manual de identidade visual e extraia todas as cores e fontes da marca. Responda APENAS com o JSON.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: pdfBase64.startsWith('data:') ? pdfBase64 : `data:application/pdf;base64,${pdfBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na API de IA:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Erro na API de IA: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Resposta vazia da IA');
    }

    console.log('Resposta da IA:', content);

    // Parse the JSON response
    let brandData;
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      brandData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Erro ao parsear resposta da IA:', parseError);
      console.error('Conteúdo recebido:', content);
      throw new Error('Não foi possível extrair dados do brandbook');
    }

    // Validate that we have valid hex colors
    const validateHexColor = (color: string) => {
      if (!color) return null;
      const match = color.match(/^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/);
      return match ? (color.startsWith('#') ? color : `#${color}`) : null;
    };

    const result = {
      success: true,
      data: {
        primary_color: validateHexColor(brandData.primary_color) || '#0891b2',
        secondary_color: validateHexColor(brandData.secondary_color) || '#06b6d4',
        accent_color: validateHexColor(brandData.accent_color) || '#0ea5e9',
        background_color: validateHexColor(brandData.background_color) || '#ffffff',
        foreground_color: validateHexColor(brandData.foreground_color) || '#0f172a',
        muted_color: validateHexColor(brandData.muted_color) || '#94a3b8',
        destructive_color: validateHexColor(brandData.destructive_color) || '#ef4444',
        success_color: validateHexColor(brandData.success_color) || '#22c55e',
        card_color: validateHexColor(brandData.card_color) || '#ffffff',
        border_color: validateHexColor(brandData.border_color) || '#e2e8f0',
        fonts: brandData.fonts || { primary: null, secondary: null },
        confidence: brandData.confidence || 'medium'
      }
    };

    console.log('Dados extraídos com sucesso:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao extrair brandbook:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
