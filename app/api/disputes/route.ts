import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileForUser, getUserFromRequest } from "@/lib/supabase/auth";
import { sendEmail } from "@/lib/email";
import { tplDisputeOpenedStub } from "@/lib/email-templates";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdminClient();
  const profile = await getProfileForUser(user.id);
  const isAdmin = profile?.role === "admin";

  if (isAdmin) {
    const { data, error } = await supabase
      .from("order_disputes")
      .select(
        `
      *,
      order:orders(
        id,
        amount,
        status,
        buyer_id,
        seller_id,
        product_id,
        escrow_status,
        payout_release_at,
        stripe_session_id,
        stripe_refund_id,
        product:products(name, brand)
      )
    `
      )
      .order("created_at", { ascending: false });

    if (error) {
      const { data: simple, error: e2 } = await supabase
        .from("order_disputes")
        .select("*")
        .order("created_at", { ascending: false });
      if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
      return NextResponse.json({ disputes: simple ?? [] });
    }

    return NextResponse.json({ disputes: data ?? [] });
  }

  const { data: myOrders, error: moErr } = await supabase
    .from("orders")
    .select("id")
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);

  if (moErr) {
    return NextResponse.json({ error: moErr.message }, { status: 500 });
  }

  const ids = (myOrders ?? []).map((o: { id: string }) => o.id);
  if (ids.length === 0) {
    return NextResponse.json({ disputes: [] });
  }

  const { data: mine, error: dErr } = await supabase
    .from("order_disputes")
    .select(
      `
      *,
      order:orders(
        id,
        amount,
        status,
        buyer_id,
        seller_id,
        product_id,
        escrow_status,
        payout_release_at,
        product:products(name, brand)
      )
    `
    )
    .in("order_id", ids)
    .order("created_at", { ascending: false });

  if (dErr) {
    return NextResponse.json({ error: dErr.message }, { status: 500 });
  }

  return NextResponse.json({ disputes: mine ?? [] });
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const orderId = body.orderId as string | undefined;
  const buyer_statement = typeof body.statement === "string" ? body.statement.trim().slice(0, 4000) : "";
  const evidence_urls = Array.isArray(body.evidenceUrls)
    ? body.evidenceUrls
        .filter((u: unknown) => typeof u === "string")
        .map((u: string) => u.slice(0, 2000))
        .slice(0, 10)
    : [];

  if (!orderId || !buyer_statement) {
    return NextResponse.json({ error: "orderId and statement required." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: order, error: oErr } = await supabase.from("orders").select("*").eq("id", orderId).single();
  if (oErr || !order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  if (order.buyer_id !== user.id) {
    return NextResponse.json({ error: "Only the buyer can open a dispute." }, { status: 403 });
  }
  if (!["paid", "shipped"].includes(order.status)) {
    return NextResponse.json({ error: "Disputes can only be opened for paid or shipped orders." }, { status: 400 });
  }

  const { data: existing } = await supabase.from("order_disputes").select("id").eq("order_id", orderId).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "A dispute already exists for this order." }, { status: 400 });
  }

  const { data: row, error } = await supabase
    .from("order_disputes")
    .insert({
      order_id: orderId,
      opened_by: user.id,
      buyer_statement,
      evidence_urls,
      status: "open",
    })
    .select("*")
    .single();

  if (error || !row) {
    return NextResponse.json({ error: error?.message ?? "Failed to create dispute." }, { status: 500 });
  }

  await supabase.from("orders").update({ escrow_status: "disputed", updated_at: new Date().toISOString() }).eq("id", orderId);

  const adminEmail = process.env.ADMIN_EMAIL ?? process.env.SMTP_USER ?? "";
  if (adminEmail) {
    try {
      const summary = `${buyer_statement.slice(0, 400)}${buyer_statement.length > 400 ? "…" : ""}`;
      await sendEmail({ to: adminEmail, ...tplDisputeOpenedStub({ orderId, summary }) });
    } catch (e) {
      console.warn("Admin dispute email failed", e);
    }
  }

  return NextResponse.json({ dispute: row });
}
