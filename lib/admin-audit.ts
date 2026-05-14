import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function logAdminAction(
  adminId: string,
  action: string,
  targetTable?: string | null,
  targetId?: string | null,
  metadata?: Record<string, unknown> | null
) {
  try {
    const supabase = createSupabaseAdminClient();
    await supabase.from("admin_actions").insert({
      admin_id: adminId,
      action,
      target_table: targetTable ?? null,
      target_id: targetId ?? null,
      metadata: metadata ?? null,
    });
  } catch (e) {
    console.warn("admin_actions log failed", e);
  }
}
