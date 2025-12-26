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

    console.log('Analisando brandbook com IA (análise aprofundada)...');

    // Use Lovable AI with vision to analyze the PDF - improved prompt for better extraction
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
            content: `Você é um especialista sênior em design e identidade visual corporativa. Sua tarefa é analisar brandbooks/manuais de identidade visual com precisão máxima.

IMPORTANTE: Responda APENAS com um JSON válido, sem markdown, sem explicações, sem código de formatação. O JSON deve seguir este formato exato:

{
  "brand_name": "Nome da marca",
  "colors": {
    "primary": "#XXXXXX",
    "secondary": "#XXXXXX",
    "accent": "#XXXXXX",
    "background": "#XXXXXX",
    "foreground": "#XXXXXX",
    "muted": "#XXXXXX",
    "destructive": "#XXXXXX",
    "success": "#XXXXXX",
    "card": "#XXXXXX",
    "border": "#XXXXXX"
  },
  "fonts": {
    "primary": "Nome da fonte principal para títulos e destaques",
    "secondary": "Nome da fonte secundária para textos corridos"
  },
  "style": {
    "border_radius": "none" | "sm" | "md" | "lg" | "full",
    "visual_tone": "modern" | "classic" | "playful" | "elegant" | "minimal" | "bold",
    "contrast_level": "high" | "medium" | "low"
  },
  "logo_description": "Breve descrição do logo (cores, forma, estilo)",
  "design_recommendations": [
    "Recomendação 1 para aplicar o visual",
    "Recomendação 2 para aplicar o visual",
    "Recomendação 3 para aplicar o visual"
  ],
  "confidence": "high" | "medium" | "low"
}

REGRAS DE EXTRAÇÃO:

## CORES (extraia as cores EXATAS do documento):
1. primary: Cor PRINCIPAL da marca (a mais predominante e característica)
2. secondary: Segunda cor mais importante da paleta
3. accent: Cor de destaque para CTAs, botões importantes, links
4. background: Cor de fundo predominante (geralmente clara)
5. foreground: Cor do texto principal (geralmente escura)
6. muted: Cor para elementos desabilitados, textos secundários, bordas sutis
7. destructive: Cor para alertas de erro (vermelho/laranja)
8. success: Cor para confirmações positivas (verde)
9. card: Cor de fundo para cards/painéis (geralmente branca ou levemente colorida)
10. border: Cor para bordas e divisórias

## FONTES:
- Identifique as famílias tipográficas usadas
- Se houver fontes personalizadas, sugira Google Fonts similares
- primary: Fonte para títulos e destaques (geralmente display/headline)
- secondary: Fonte para corpo de texto (geralmente sans-serif legível)

## ESTILO:
- border_radius: Baseado nos cantos dos elementos visuais
  - none: Cantos totalmente retos
  - sm: Cantos levemente arredondados
  - md: Cantos moderadamente arredondados
  - lg: Cantos bem arredondados
  - full: Elementos circulares/pill

- visual_tone: Tom geral do design
- contrast_level: Nível de contraste entre elementos

## RECOMENDAÇÕES:
Forneça 3-5 dicas práticas para aplicar a identidade visual corretamente.

Todas as cores DEVEM estar em formato hexadecimal (#XXXXXX).
Se não encontrar uma cor específica, derive-a logicamente das cores encontradas mantendo a harmonia visual.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analise este brandbook/manual de identidade visual com extrema atenção aos detalhes. Extraia TODAS as cores da paleta principal, identifique as fontes tipográficas, e observe o estilo visual (arredondamento de cantos, tom, contraste). Forneça recomendações práticas para aplicar esta identidade. Responda APENAS com o JSON, sem formatação markdown.'
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
        max_tokens: 3000,
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

    // Extract colors from nested structure or flat structure
    const colors = brandData.colors || brandData;
    
    const result = {
      success: true,
      data: {
        brand_name: brandData.brand_name || null,
        primary_color: validateHexColor(colors.primary || colors.primary_color) || '#0891b2',
        secondary_color: validateHexColor(colors.secondary || colors.secondary_color) || '#06b6d4',
        accent_color: validateHexColor(colors.accent || colors.accent_color) || '#0ea5e9',
        background_color: validateHexColor(colors.background || colors.background_color) || '#ffffff',
        foreground_color: validateHexColor(colors.foreground || colors.foreground_color) || '#0f172a',
        muted_color: validateHexColor(colors.muted || colors.muted_color) || '#94a3b8',
        destructive_color: validateHexColor(colors.destructive || colors.destructive_color) || '#ef4444',
        success_color: validateHexColor(colors.success || colors.success_color) || '#22c55e',
        card_color: validateHexColor(colors.card || colors.card_color) || '#ffffff',
        border_color: validateHexColor(colors.border || colors.border_color) || '#e2e8f0',
        fonts: {
          primary: brandData.fonts?.primary || null,
          secondary: brandData.fonts?.secondary || null
        },
        style: {
          border_radius: brandData.style?.border_radius || 'md',
          visual_tone: brandData.style?.visual_tone || 'modern',
          contrast_level: brandData.style?.contrast_level || 'medium'
        },
        logo_description: brandData.logo_description || null,
        design_recommendations: brandData.design_recommendations || [],
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
