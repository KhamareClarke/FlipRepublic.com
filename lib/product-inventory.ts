import type { SupabaseClient } from "@supabase/supabase-js";

/** PostgREST filter: not tracking stock, or tracked with quantity remaining. */
export const MARKETPLACE_STOCK_OR = "track_inventory.eq.false,stock_quantity.gt.0";

export function isProductPurchasable(row: {
  status: string;
  track_inventory?: boolean | null;
  stock_quantity?: number | null;
}): boolean {
  if (row.status !== "active") return false;
  if (!row.track_inventory) return true;
  const q = Number(row.stock_quantity ?? 0);
  return q > 0;
}

export async function fulfillProductAfterSale(
  supabase: SupabaseClient,
  productId: string
): Promise<void> {
  const { data: p, error } = await supabase
    .from("products")
    .select("track_inventory, stock_quantity, status")
    .eq("id", productId)
    .maybeSingle();

  if (error || !p) return;

  if (!p.track_inventory) {
    await supabase.from("products").update({ status: "sold" }).eq("id", productId);
    return;
  }

  const current = Math.max(0, Math.floor(Number(p.stock_quantity ?? 0)));
  const next = Math.max(0, current - 1);
  const patch: Record<string, unknown> = { stock_quantity: next };
  if (next <= 0) {
    patch.status = "sold";
  }
  await supabase.from("products").update(patch).eq("id", productId);
}
