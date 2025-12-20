import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate date 12 months and 1 day ago
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 12);
    cutoffDate.setDate(cutoffDate.getDate() - 1);

    console.log("[CLEANUP] Deleting access logs older than:", cutoffDate.toISOString());

    // Delete old logs
    const { data, error, count } = await supabase
      .from("dashboard_access_logs")
      .delete()
      .lt("accessed_at", cutoffDate.toISOString())
      .select("id");

    if (error) {
      console.error("[CLEANUP] Error deleting old logs:", error);
      throw error;
    }

    const deletedCount = data?.length || 0;
    console.log("[CLEANUP] Deleted", deletedCount, "old access logs");

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted_count: deletedCount,
        cutoff_date: cutoffDate.toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[CLEANUP] Error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
