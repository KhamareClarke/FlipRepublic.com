import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createSupabaseAdminClient();
  const { data: sellers, error } = await supabase
    .from("sellers")
    .select("user_id, username, is_admin_approved, created_at")
    .eq("is_admin_approved", true)
    .eq("is_banned", false)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sellerIds = (sellers ?? []).map((seller) => seller.user_id);
  const { data: orders } = await supabase
    .from("orders")
    .select("seller_id, amount")
    .in("seller_id", sellerIds);

  const totals = (orders ?? []).reduce<Record<string, { sales: number; value: number }>>(
    (acc, order) => {
      const entry = acc[order.seller_id] ?? { sales: 0, value: 0 };
      entry.sales += 1;
      entry.value += Number(order.amount ?? 0);
      acc[order.seller_id] = entry;
      return acc;
    },
    {}
  );

  const response = (sellers ?? []).map((seller) => ({
    id: seller.user_id,
    name: seller.username ?? "Verified Seller",
    verified: seller.is_admin_approved,
    totalSales: totals[seller.user_id]?.sales ?? 0,
    totalValue: totals[seller.user_id]?.value ?? 0,
    joinedDate: seller.created_at,
    specialization: "Verified luxury seller",
  }));

  return NextResponse.json({ sellers: response });
}
