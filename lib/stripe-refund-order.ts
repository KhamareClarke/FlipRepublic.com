import Stripe from "stripe";

export type StripeRefundResult =
  | { ok: true; refundId: string }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; error: string };

/**
 * Refund a Checkout payment. Uses stored payment_intent when present, otherwise loads the Session.
 */
export async function createStripeRefundForOrder(params: {
  stripeSessionId: string | null | undefined;
  stripePaymentIntentId: string | null | undefined;
}): Promise<StripeRefundResult> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return { ok: true, skipped: true, reason: "STRIPE_SECRET_KEY not set" };
  }

  const stripe = new Stripe(key, { apiVersion: "2024-06-20" as any });

  let paymentIntentId = params.stripePaymentIntentId ?? null;
  if (!paymentIntentId && params.stripeSessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(params.stripeSessionId);
      paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent && typeof session.payment_intent === "object" && "id" in session.payment_intent
            ? (session.payment_intent as Stripe.PaymentIntent).id
            : null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Session retrieve failed";
      return { ok: false, error: msg };
    }
  }

  if (!paymentIntentId) {
    return { ok: true, skipped: true, reason: "No Checkout session or payment intent on file" };
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: "requested_by_customer",
    });
    return { ok: true, refundId: refund.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Refund failed";
    if (/already been refunded|has already been refunded/i.test(msg)) {
      return { ok: true, skipped: true, reason: "Already refunded in Stripe" };
    }
    return { ok: false, error: msg };
  }
}
