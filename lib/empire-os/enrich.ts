import type { SupabaseClient } from "@supabase/supabase-js";

/** Attach counts used by Empire OS skills for order.paid / offer.created. */
export async function enrichOrderPaidPayload(
  supabase: SupabaseClient,
  base: Record<string, unknown> & { amount?: number; seller_id?: string }
): Promise<Record<string, unknown>> {
  const buyerId = base.buyer_id as string | undefined;
  const sellerId = base.seller_id as string | undefined;
  const out = { ...base };

  if (buyerId) {
    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("buyer_id", buyerId)
      .in("status", ["paid", "shipped", "completed"]);
    out.buyer_order_count = count ?? 0;
  }

  if (sellerId) {
    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", sellerId)
      .in("status", ["paid", "shipped", "completed"]);
    out.seller_paid_orders = count ?? 0;
  }

  return out;
}
