import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileForUser, getUserFromRequest } from "@/lib/supabase/auth";
import { logAdminAction } from "@/lib/admin-audit";
import { createStripeRefundForOrder } from "@/lib/stripe-refund-order";
import { sendEmail } from "@/lib/email";
import { tplDisputeResolvedStub } from "@/lib/email-templates";

export const runtime = "nodejs";

const RESOLUTIONS = ["under_review", "resolved_refund", "resolved_release", "dismissed"] as const;

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getProfileForUser(user.id);
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const status = body.status as (typeof RESOLUTIONS)[number] | undefined;
  if (!status || !RESOLUTIONS.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const admin_notes = typeof body.admin_notes === "string" ? body.admin_notes.slice(0, 4000) : null;
  const admin_resolution = typeof body.admin_resolution === "string" ? body.admin_resolution.slice(0, 4000) : null;
  const relistProduct = body.relistProduct === true;

  const supabase = createSupabaseAdminClient();
  const { data: dispute, error: dErr } = await supabase
    .from("order_disputes")
    .select("*")
    .eq("id", context.params.id)
    .single();

  if (dErr || !dispute) {
    return NextResponse.json({ error: "Dispute not found." }, { status: 404 });
  }

  const { data: order, error: oFetchErr } = await supabase
    .from("orders")
    .select("*")
    .eq("id", dispute.order_id as string)
    .single();

  if (oFetchErr || !order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  let stripeRefundId: string | null = null;
  let stripeRefundMeta: { ok: boolean; skipped?: boolean; reason?: string; error?: string } = { ok: true };

  if (status === "resolved_refund") {
    if (order.status !== "refunded") {
      const refundResult = await createStripeRefundForOrder({
        stripeSessionId: order.stripe_session_id,
        stripePaymentIntentId: order.stripe_payment_intent_id,
      });

      if (!refundResult.ok && !("skipped" in refundResult && refundResult.skipped)) {
        return NextResponse.json({ error: refundResult.error ?? "Stripe refund failed." }, { status: 502 });
      }

      stripeRefundMeta = refundResult as typeof stripeRefundMeta;
      if ("refundId" in refundResult && refundResult.refundId) {
        stripeRefundId = refundResult.refundId;
      }
    }
  }

  const now = new Date().toISOString();
  const { data: updated, error: uErr } = await supabase
    .from("order_disputes")
    .update({
      status,
      admin_notes,
      admin_resolution,
      resolved_by: user.id,
      updated_at: now,
    })
    .eq("id", context.params.id)
    .select("*")
    .single();

  if (uErr || !updated) {
    return NextResponse.json({ error: uErr?.message ?? "Update failed." }, { status: 500 });
  }

  const orderId = dispute.order_id as string;
  const orderUpdates: Record<string, unknown> = { updated_at: now };

  if (status === "resolved_refund") {
    orderUpdates.status = "refunded";
    orderUpdates.escrow_status = "none";
    if (stripeRefundId) orderUpdates.stripe_refund_id = stripeRefundId;
    if (relistProduct && order.product_id) {
      await supabase.from("products").update({ status: "active" }).eq("id", order.product_id);
    }
  } else if (status === "resolved_release") {
    orderUpdates.escrow_status = "released";
    orderUpdates.payout_release_at = now;
  } else if (status === "dismissed") {
    orderUpdates.escrow_status = "holding";
  } else if (status === "under_review") {
    orderUpdates.escrow_status = "disputed";
  }

  await supabase.from("orders").update(orderUpdates).eq("id", orderId);

  await logAdminAction(user.id, `dispute_${status}`, "order_disputes", context.params.id, {
    order_id: orderId,
    admin_notes,
    stripe_refund: stripeRefundMeta,
    relistProduct,
  });

  try {
    const { data: buyerAuth } = await supabase.auth.admin.getUserById(order.buyer_id as string);
    const { data: sellerAuth } = await supabase.auth.admin.getUserById(order.seller_id as string);
    const buyerEmail = buyerAuth?.user?.email;
    const sellerEmail = sellerAuth?.user?.email;
    const mail = tplDisputeResolvedStub({
      orderId,
      status,
      resolution: admin_resolution ?? status,
    });
    if (buyerEmail) await sendEmail({ to: buyerEmail, ...mail });
    if (sellerEmail && sellerEmail !== buyerEmail) await sendEmail({ to: sellerEmail, ...mail });
  } catch (e) {
    console.warn("Dispute resolution email failed", e);
  }

  return NextResponse.json({ dispute: updated, stripeRefund: stripeRefundMeta });
}
