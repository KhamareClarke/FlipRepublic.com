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
  const since7 = new Date(Date.now() - 7 * 86400000).toISOString();
  const since30 = new Date(Date.now() - 30 * 86400000).toISOString();

  const [
    ordersRes,
    viewsRes,
    searchesRes,
    disputesRes,
    empireEventsRes,
    empireSuggestionsRes,
    productsActiveRes,
    holdingEscrowRes,
  ] = await Promise.all([
    supabase.from("orders").select("amount, created_at, status").gte("created_at", since30),
    supabase
      .from("product_view_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since7),
    supabase
      .from("search_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since7),
    supabase
      .from("order_disputes")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "under_review"]),
    supabase
      .from("empire_os_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since7),
    supabase
      .from("empire_os_suggestions")
      .select("id", { count: "exact", head: true })
      .eq("dismissed", false),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("escrow_status", "holding"),
  ]);

  const orders = ordersRes.data ?? [];
  const revenue30 = orders.reduce((s, o) => s + Number(o.amount ?? 0), 0);
  const orders7 = orders.filter((o) => o.created_at >= since7).length;

  const revenueByDay: { day: string; revenue: number; orders: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayOrders = orders.filter((o) => (o.created_at as string).slice(0, 10) === key);
    revenueByDay.push({
      day: key,
      revenue: dayOrders.reduce((s, o) => s + Number(o.amount ?? 0), 0),
      orders: dayOrders.length,
    });
  }

  const { data: topSearches } = await supabase
    .from("search_events")
    .select("query")
    .gte("created_at", since30)
    .not("query", "is", null)
    .limit(500);

  const searchCounts: Record<string, number> = {};
  for (const row of topSearches ?? []) {
    const q = (row.query as string)?.trim().toLowerCase();
    if (!q) continue;
    searchCounts[q] = (searchCounts[q] ?? 0) + 1;
  }
  const topSearchQueries = Object.entries(searchCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([query, count]) => ({ query, count }));

  const { data: skillEvents } = await supabase
    .from("empire_os_events")
    .select("skills_applied")
    .gte("created_at", since7)
    .limit(200);

  const skillHits: Record<string, number> = {};
  for (const ev of skillEvents ?? []) {
    for (const id of (ev.skills_applied as string[]) ?? []) {
      skillHits[id] = (skillHits[id] ?? 0) + 1;
    }
  }
  const topSkills = Object.entries(skillHits)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([skill_id, hits]) => ({ skill_id, hits }));

  return NextResponse.json({
    revenue30,
    orders7,
    orders30: orders.length,
    views7: viewsRes.count ?? 0,
    searches7: searchesRes.count ?? 0,
    openDisputes: disputesRes.count ?? 0,
    empireEvents7: empireEventsRes.count ?? 0,
    openEmpireSuggestions: empireSuggestionsRes.count ?? 0,
    activeListings: productsActiveRes.count ?? 0,
    escrowHolding: holdingEscrowRes.count ?? 0,
    revenueByDay,
    topSearchQueries,
    topSkills,
    empireSkillTotal: 33,
  });
}
