import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileForUser, getUserFromRequest } from "@/lib/supabase/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getProfileForUser(user.id);
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createSupabaseAdminClient();
  const since = new Date(Date.now() - 60 * 86400000).toISOString();

  const { data: refunded } = await supabase
    .from("orders")
    .select("seller_id, amount")
    .eq("status", "refunded")
    .gte("updated_at", since);

  const sellerRefundTotals = new Map<string, { count: number; amount: number }>();
  for (const r of refunded ?? []) {
    const sid = (r as { seller_id: string }).seller_id;
    const cur = sellerRefundTotals.get(sid) ?? { count: 0, amount: 0 };
    cur.count += 1;
    cur.amount += Number((r as { amount: number }).amount ?? 0);
    sellerRefundTotals.set(sid, cur);
  }
  const highRefundSellers = Array.from(sellerRefundTotals.entries())
    .filter(([, v]) => v.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 15)
    .map(([seller_id, v]) => ({ seller_id, refunds: v.count, amount: v.amount }));

  const { data: activeProducts } = await supabase
    .from("products")
    .select("id, seller_id, price, category_id, name")
    .eq("status", "active")
    .limit(400);

  const priceByCategory = new Map<string | null, number[]>();
  for (const p of activeProducts ?? []) {
    const cid = (p as { category_id: string | null }).category_id;
    const price = Number((p as { price: number }).price);
    if (!Number.isFinite(price)) continue;
    const arr = priceByCategory.get(cid) ?? [];
    arr.push(price);
    priceByCategory.set(cid, arr);
  }

  const median = (nums: number[]) => {
    if (!nums.length) return 0;
    const s = [...nums].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };

  const outlierListings: { id: string; name: string; seller_id: string; price: number; categoryMedian: number }[] = [];
  for (const p of activeProducts ?? []) {
    const cid = (p as { category_id: string | null }).category_id;
    const price = Number((p as { price: number }).price);
    const meds = priceByCategory.get(cid) ?? [];
    const med = median(meds);
    if (med > 0 && price > med * 4) {
      outlierListings.push({
        id: (p as { id: string }).id,
        name: (p as { name: string }).name,
        seller_id: (p as { seller_id: string }).seller_id,
        price,
        categoryMedian: Math.round(med * 100) / 100,
      });
    }
  }

  return NextResponse.json({
    highRefundSellers,
    priceOutlierListings: outlierListings.slice(0, 20),
    note: "Heuristic signals only — review before action.",
  });
}
