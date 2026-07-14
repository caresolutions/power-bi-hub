import { supabase } from "@/integrations/supabase/client";

export type EditEntityType =
  | "dashboard"
  | "powerbi_report"
  | "user"
  | "user_group";

export type EditAction = "create" | "update" | "delete" | "save";

export interface EditLogInput {
  entityType: EditEntityType;
  entityId?: string | null;
  entityName?: string | null;
  action: EditAction;
  companyId?: string | null;
  details?: Record<string, unknown> | null;
}

export async function logEdit(input: EditLogInput): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;

    let companyId = input.companyId ?? null;
    if (!companyId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .maybeSingle();
      companyId = profile?.company_id ?? null;
    }

    await supabase.from("edit_logs").insert({
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      entity_name: input.entityName ?? null,
      action: input.action,
      user_id: user.id,
      user_email: user.email ?? null,
      company_id: companyId,
      details: (input.details ?? null) as any,
    });
  } catch (err) {
    console.warn("Failed to write edit log", err);
  }
}
