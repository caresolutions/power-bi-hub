import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { content, targetLanguage } = await req.json();

    if (!content || !targetLanguage) {
      return new Response(
        JSON.stringify({ error: 'Content and target language are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const languageNames: Record<string, string> = {
      'en': 'English',
      'es': 'Spanish',
      'zh': 'Chinese',
      'pt-BR': 'Brazilian Portuguese'
    };

    const targetLangName = languageNames[targetLanguage] || targetLanguage;

    // Use Lovable AI for translation
    const response = await fetch('https://api.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a professional legal document translator. Translate the following content to ${targetLangName}. 
            Maintain the exact same JSON structure. Keep all formatting markers like ** for bold text intact.
            Return ONLY the translated JSON, no explanations or additional text.`
          },
          {
            role: 'user',
            content: JSON.stringify(content)
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', errorText);
      throw new Error('Translation service error');
    }

    const data = await response.json();
    const translatedText = data.choices[0]?.message?.content;

    if (!translatedText) {
      throw new Error('No translation received');
    }

    // Parse the translated content
    let translatedContent;
    try {
      // Remove markdown code blocks if present
      const cleanedText = translatedText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      translatedContent = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Parse error:', parseError, 'Raw text:', translatedText);
      throw new Error('Failed to parse translation');
    }

    return new Response(
      JSON.stringify({ translatedContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Translation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Translation failed';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
