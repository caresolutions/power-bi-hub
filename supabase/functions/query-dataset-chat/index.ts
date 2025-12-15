import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PowerBIConfig {
  client_id: string;
  client_secret: string;
  tenant_id: string;
  username: string;
  password: string;
}

// Decrypt sensitive data
async function decryptValue(ciphertext: string, keyString: string): Promise<string> {
  const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  
  const keyBuffer = Uint8Array.from(atob(keyString), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
  
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );
  
  return new TextDecoder().decode(decrypted);
}

// Get Azure AD access token
async function getAzureAccessToken(config: PowerBIConfig): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${config.tenant_id}/oauth2/v2.0/token`;
  
  const body = new URLSearchParams({
    grant_type: "password",
    client_id: config.client_id,
    client_secret: config.client_secret,
    scope: "https://analysis.windows.net/powerbi/api/.default",
    username: config.username,
    password: config.password,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Token error:", error);
    throw new Error("Falha na autenticação com Power BI");
  }

  const data = await response.json();
  return data.access_token;
}

// Execute DAX query against dataset
async function executeDaxQuery(accessToken: string, datasetId: string, daxQuery: string): Promise<any> {
  const url = `https://api.powerbi.com/v1.0/myorg/datasets/${datasetId}/executeQueries`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      queries: [{ query: daxQuery }],
      serializerSettings: { includeNulls: true },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("DAX query error:", error);
    throw new Error("Falha ao executar query DAX: " + error);
  }

  return await response.json();
}

// Use Lovable AI to generate DAX query from natural language
async function generateDaxQuery(question: string, tableSchema: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const systemPrompt = `Você é um especialista em DAX (Data Analysis Expressions) para Power BI.
Sua tarefa é converter perguntas em português para queries DAX válidas.

REGRAS IMPORTANTES:
1. Sempre use EVALUATE no início da query
2. Use TOPN para limitar resultados (máximo 100 linhas)
3. Use SUMMARIZECOLUMNS para agregações
4. Retorne APENAS a query DAX, sem explicações
5. Se não conseguir gerar uma query válida, retorne: EVALUATE ROW("Erro", "Não foi possível interpretar a pergunta")

Esquema das tabelas disponíveis:
${tableSchema || "Esquema não disponível - tente inferir das tabelas comuns de BI"}

Exemplos:
- "Top 10 empresas por vendas" -> EVALUATE TOPN(10, SUMMARIZECOLUMNS('Empresa'[Nome], "Total", SUM('Vendas'[Valor])), [Total], DESC)
- "Total de vendas" -> EVALUATE ROW("Total Vendas", SUM('Vendas'[Valor]))`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("AI error:", error);
    throw new Error("Falha ao processar pergunta com IA");
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

// Use Lovable AI to format the response
async function formatResponse(question: string, daxResult: any): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const systemPrompt = `Você é um assistente de análise de dados amigável.
Sua tarefa é interpretar resultados de queries e responder de forma clara e concisa em português.

REGRAS:
1. Seja direto e objetivo
2. Formate números de forma legível (ex: R$ 1.234,56)
3. Se houver uma lista, apresente de forma organizada
4. Se não houver dados, informe educadamente
5. Não mencione termos técnicos como "DAX" ou "query"`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Pergunta do usuário: "${question}"\n\nResultado dos dados:\n${JSON.stringify(daxResult, null, 2)}` },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error("Falha ao formatar resposta");
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dashboardId, question } = await req.json();
    
    if (!dashboardId || !question) {
      throw new Error("dashboardId e question são obrigatórios");
    }

    console.log(`Processing question for dashboard ${dashboardId}: ${question}`);

    // Get authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Não autenticado");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get dashboard info
    const { data: dashboard, error: dashboardError } = await supabase
      .from("dashboards")
      .select("dataset_id, credential_id, name")
      .eq("id", dashboardId)
      .single();

    if (dashboardError || !dashboard) {
      throw new Error("Dashboard não encontrado");
    }

    if (!dashboard.dataset_id) {
      throw new Error("Este dashboard não possui um dataset configurado");
    }

    if (!dashboard.credential_id) {
      throw new Error("Este dashboard não possui credenciais configuradas");
    }

    // Get credentials
    const { data: credential, error: credError } = await supabase
      .from("power_bi_configs")
      .select("client_id, client_secret, tenant_id, username, password")
      .eq("id", dashboard.credential_id)
      .single();

    if (credError || !credential) {
      throw new Error("Credenciais não encontradas");
    }

    // Decrypt sensitive fields
    const encryptionKey = Deno.env.get("ENCRYPTION_KEY");
    let config: PowerBIConfig;

    if (encryptionKey) {
      config = {
        client_id: credential.client_id,
        client_secret: await decryptValue(credential.client_secret, encryptionKey),
        tenant_id: credential.tenant_id,
        username: credential.username || "",
        password: credential.password ? await decryptValue(credential.password, encryptionKey) : "",
      };
    } else {
      config = {
        client_id: credential.client_id,
        client_secret: credential.client_secret,
        tenant_id: credential.tenant_id,
        username: credential.username || "",
        password: credential.password || "",
      };
    }

    // Generate DAX query using AI
    console.log("Generating DAX query...");
    const daxQuery = await generateDaxQuery(question, "");
    console.log("Generated DAX:", daxQuery);

    // Get access token
    console.log("Getting access token...");
    const accessToken = await getAzureAccessToken(config);

    // Execute DAX query
    console.log("Executing DAX query...");
    const queryResult = await executeDaxQuery(accessToken, dashboard.dataset_id, daxQuery);
    console.log("Query result:", JSON.stringify(queryResult).substring(0, 500));

    // Format response using AI
    console.log("Formatting response...");
    const formattedResponse = await formatResponse(question, queryResult);

    return new Response(
      JSON.stringify({
        success: true,
        answer: formattedResponse,
        daxQuery: daxQuery,
        rawData: queryResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in query-dataset-chat:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
