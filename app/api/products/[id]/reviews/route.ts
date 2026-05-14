import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRequestClient } from "@/lib/supabase/request";
import { getUserFromRequest } from "@/lib/supabase/auth";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const productId = context.params.id;
  const supabase = createSupabaseRequestClient();

  const { data: reviews, error } = await supabase
    .from("product_reviews")
    .select("id, rating, body, buyer_username, created_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ reviews: [], stats: { avg: null, count: 0 }, eligible: false, eligibleOrderId: null });
  }

  const list = reviews ?? [];
  const count = list.length;
  const avg = count ? list.reduce((s, r) => s + Number(r.rating), 0) / count : null;

  let eligible = false;
  let eligibleOrderId: string | null = null;
  const user = await getUserFromRequest(request);
  if (user) {
    const accessToken = request.headers.get("authorization")?.replace("Bearer ", "");
    const authClient = createSupabaseRequestClient(accessToken);
    const { data: order } = await authClient
      .from("orders")
      .select("id")
      .eq("buyer_id", user.id)
      .eq("product_id", productId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (order?.id) {
      const { data: existing } = await authClient
        .from("product_reviews")
        .select("id")
        .eq("order_id", order.id)
        .maybeSingle();
      if (!existing) {
        eligible = true;
        eligibleOrderId = order.id;
      }
    }
  }

  return NextResponse.json({
    reviews: list,
    stats: { avg, count },
    eligible,
    eligibleOrderId,
  });
}

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const { orderId, rating, body } = payload as {
    orderId?: string;
    rating?: number;
    body?: string;
  };

  if (!orderId || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "orderId and rating (1–5) required." }, { status: 400 });
  }

  const supabase = createSupabaseRequestClient(accessToken);

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, buyer_id, product_id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr || !order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  if (order.buyer_id !== user.id || order.product_id !== context.params.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (order.status !== "completed") {
    return NextResponse.json({ error: "You can only review completed orders." }, { status: 400 });
  }

  const { data: profile } = await supabase.from("profiles").select("username").eq("user_id", user.id).maybeSingle();

  const { data: row, error } = await supabase
    .from("product_reviews")
    .insert({
      product_id: context.params.id,
      buyer_id: user.id,
      order_id: orderId,
      rating: Math.round(rating),
      body: (body ?? "").slice(0, 2000),
      buyer_username: profile?.username ?? "Buyer",
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "You already reviewed this purchase." }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ review: row });
}
