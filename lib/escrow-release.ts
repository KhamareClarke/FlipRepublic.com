import type { SupabaseClient } from "@supabase/supabase-js";

/** Release escrow holds whose payout_release_at has passed. */
export async function releaseDueEscrowHolds(supabase: SupabaseClient): Promise<number> {
  const now = new Date().toISOString();
  const { data: due, error } = await supabase
    .from("orders")
    .select("id")
    .eq("escrow_status", "holding")
    .not("payout_release_at", "is", null)
    .lte("payout_release_at", now)
    .limit(200);

  if (error || !due?.length) {
    return 0;
  }

  const ids = due.map((o) => o.id);
  const { error: updErr } = await supabase
    .from("orders")
    .update({ escrow_status: "released", updated_at: now })
    .in("id", ids);

  if (updErr) {
    console.error("[escrow] release failed", updErr);
    return 0;
  }

  return ids.length;
}
