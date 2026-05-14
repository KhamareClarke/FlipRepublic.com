import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileForUser, getUserFromRequest } from "@/lib/supabase/auth";

export const runtime = "nodejs";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x.toISOString();
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfileForUser(user.id);
  if (!profile || (profile.role !== "seller" && profile.role !== "admin")) {
    return NextResponse.json({ error: "Seller only." }, { status: 403 });
  }

  const supabase = createSupabaseAdminClient();
  const sellerId = user.id;
  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * 86400000).toISOString();
  const since7 = new Date(now.getTime() - 7 * 86400000).toISOString();

  const [
    views30,
    views7,
    viewsByProduct,
    ordersSeller,
    viewsByReferrer,
    searchTop,
  ] = await Promise.all([
    supabase
      .from("product_view_events")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", sellerId)
      .gte("created_at", since30),
    supabase
      .from("product_view_events")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", sellerId)
      .gte("created_at", since7),
    supabase
      .from("product_view_events")
      .select("product_id")
      .eq("seller_id", sellerId)
      .gte("created_at", since30),
    supabase
      .from("orders")
      .select("*")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("product_view_events")
      .select("referrer")
      .eq("seller_id", sellerId)
      .gte("created_at", since30)
      .limit(2000),
    supabase.from("search_events").select("query, result_count").gte("created_at", since30).limit(500),
  ]);

  const viewRows = viewsByProduct.data ?? [];
  const viewCountByProduct = new Map<string, number>();
  for (const row of viewRows) {
    const pid = row.product_id as string;
    if (!pid) continue;
    viewCountByProduct.set(pid, (viewCountByProduct.get(pid) ?? 0) + 1);
  }
  const topProductIds = Array.from(viewCountByProduct.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id]) => id);

  let topProducts: { id: string; name: string; views: number }[] = [];
  if (topProductIds.length > 0) {
    const { data: prods } = await supabase.from("products").select("id, name").in("id", topProductIds);
    const nameBy = new Map((prods ?? []).map((p: { id: string; name: string }) => [p.id, p.name]));
    topProducts = topProductIds.map((id) => ({
      id,
      name: nameBy.get(id) ?? "Listing",
      views: viewCountByProduct.get(id) ?? 0,
    }));
  }

  const orders = ordersSeller.data ?? [];
  const paidOrders = orders.filter((o: { status: string }) =>
    ["paid", "shipped", "completed"].includes(o.status)
  );
  const revenue30 = paidOrders
    .filter((o: { created_at: string }) => o.created_at >= since30)
    .reduce((s: number, o: { amount: number }) => s + Number(o.amount ?? 0), 0);

  const revenueByDay: { day: string; revenue: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const day = new Date(now.getTime() - i * 86400000);
    const key = startOfDay(day).slice(0, 10);
    revenueByDay.push({ day: key, revenue: 0 });
  }
  for (const o of paidOrders) {
    const d = startOfDay(new Date(o.created_at)).slice(0, 10);
    const bucket = revenueByDay.find((b) => b.day === d);
    if (bucket) bucket.revenue += Number(o.amount ?? 0);
  }

  const categoryTotals = new Map<string, number>();
  const productIdsInOrders = Array.from(new Set(paidOrders.map((o: { product_id: string }) => o.product_id)));
  if (productIdsInOrders.length > 0) {
    const { data: plist } = await supabase
      .from("products")
      .select("id, category:categories(name)")
      .in("id", productIdsInOrders.slice(0, 200));
    const catByProduct = new Map<string, string>();
    for (const p of plist ?? []) {
      const row = p as { id: string; category?: { name?: string } | null };
      const name = row.category?.name ?? "Uncategorised";
      catByProduct.set(row.id, name);
    }
    for (const o of paidOrders) {
      const catName = catByProduct.get(o.product_id) ?? "Uncategorised";
      categoryTotals.set(catName, (categoryTotals.get(catName) ?? 0) + Number(o.amount ?? 0));
    }
  }

  const topCategories = Array.from(categoryTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, revenue]) => ({ name, revenue }));

  const countryTotals = new Map<string, number>();
  for (const o of paidOrders) {
    const c = (o as { shipping_country?: string }).shipping_country || "Unknown";
    countryTotals.set(c, (countryTotals.get(c) ?? 0) + 1);
  }
  const buyerCountries = Array.from(countryTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([country, orderCount]) => ({ country, orders: orderCount }));

  const refCounts = new Map<string, number>();
  for (const r of viewsByReferrer.data ?? []) {
    const ref = (r as { referrer: string | null }).referrer || "(direct / unknown)";
    refCounts.set(ref, (refCounts.get(ref) ?? 0) + 1);
  }
  const trafficSources = Array.from(refCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([source, views]) => ({ source: source.slice(0, 120), views }));

  const views30n = views30.count ?? 0;
  const conversionsApprox =
    views30n > 0 ? Math.min(1, paidOrders.filter((o) => o.created_at >= since30).length / views30n) : 0;

  const queryCounts = new Map<string, number>();
  for (const s of searchTop.data ?? []) {
    const q = ((s as { query: string | null }).query ?? "").trim();
    if (!q) continue;
    queryCounts.set(q, (queryCounts.get(q) ?? 0) + 1);
  }
  const topSearchQueries = Array.from(queryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([query, count]) => ({ query, count }));

  return NextResponse.json({
    viewsLast30Days: views30n,
    viewsLast7Days: views7.count ?? 0,
    revenueLast30Days: revenue30,
    revenueByDay14: revenueByDay,
    ordersLast90: orders.length,
    topProductsByViews: topProducts,
    topCategories,
    buyerCountries,
    trafficSources,
    conversionApprox30d: Math.round(conversionsApprox * 1000) / 1000,
    topSearchQueries,
  });
}
