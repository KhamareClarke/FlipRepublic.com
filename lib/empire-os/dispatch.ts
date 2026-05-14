import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { EMPIRE_SKILLS } from "./skills";

export type EmpireDispatchInput = {
  event_type: string;
  payload?: Record<string, unknown>;
  actor_user_id?: string | null;
  product_id?: string | null;
  order_id?: string | null;
};

/**
 * Records a marketplace event and runs registered Empire OS skills (deterministic rules).
 * Safe to fire-and-forget from API routes; failures are logged only.
 */
export async function empireDispatch(input: EmpireDispatchInput): Promise<void> {
  if (process.env.EMPIRE_OS_ENABLED === "false") {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const payload = input.payload ?? {};

  const { data: row, error } = await supabase
    .from("empire_os_events")
    .insert({
      event_type: input.event_type,
      payload,
      actor_user_id: input.actor_user_id ?? null,
      product_id: input.product_id ?? null,
      order_id: input.order_id ?? null,
    })
    .select("id")
    .single();

  if (error || !row?.id) {
    console.error("[empire_os] event insert failed", error);
    return;
  }

  const ctx = {
    supabase,
    eventId: row.id as string,
    event_type: input.event_type,
    payload,
    actor_user_id: input.actor_user_id ?? null,
    product_id: input.product_id ?? null,
    order_id: input.order_id ?? null,
  };

  const applied: string[] = [];
  const notes: string[] = [];

  for (const skill of EMPIRE_SKILLS) {
    try {
      if (!skill.when(input.event_type, payload)) continue;
      await skill.run(ctx);
      applied.push(skill.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      notes.push(`${skill.id}: ${msg}`);
      console.error("[empire_os] skill", skill.id, e);
    }
  }

  await supabase
    .from("empire_os_events")
    .update({
      skills_applied: applied,
      processing_notes: notes.length ? notes.join(" | ").slice(0, 2000) : null,
    })
    .eq("id", row.id);
}
