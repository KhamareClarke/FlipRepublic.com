import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { escrowFieldsForNewOrder } from "@/lib/escrow";
import { fulfillProductAfterSale } from "@/lib/product-inventory";
import { incrementCouponRedemption } from "@/lib/coupons";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY ?? "";
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

export async function POST(request: NextRequest) {
  if (!stripeSecretKey || !stripeWebhookSecret) {
    return NextResponse.json({ error: "Stripe webhook not configured." }, { status: 500 });
  }

  const signature = headers().get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const body = await request.text();
  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" as any });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
  } catch (error) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata ?? {};
    const productId = metadata.product_id;
    const sellerId = metadata.seller_id;
    const buyerId = metadata.buyer_id;
    const amount = Number(metadata.amount ?? 0);
    const discountAmount = Number(metadata.discount_amount ?? 0);
    const couponIdRaw = metadata.coupon_id;
    const couponId =
      couponIdRaw && typeof couponIdRaw === "string" && couponIdRaw.length > 0 ? couponIdRaw : null;

    if (productId && sellerId && buyerId) {
      const supabase = createSupabaseAdminClient();

      const { data: existingOrder } = await supabase
        .from("orders")
        .select("id")
        .eq("stripe_session_id", session.id)
        .maybeSingle();
      if (existingOrder) {
        return NextResponse.json({ received: true });
      }

      // Get shipping address from metadata (collected in checkout modal)
      const shippingAddress = metadata.shipping_address || "";
      const shippingCity = metadata.shipping_city || "";
      const shippingPostalCode = metadata.shipping_postal_code || "";
      const shippingCountry = metadata.shipping_country || "United Kingdom";
      const shippingPhone = metadata.shipping_phone || "";
      const buyerName = metadata.buyer_name || session.customer_details?.name || "";
      
      // Create order with shipping address
      const orderData: any = {
        buyer_id: buyerId,
        seller_id: sellerId,
        product_id: productId,
        amount,
        status: "paid",
        stripe_session_id: session.id,
        ...escrowFieldsForNewOrder(),
      };

      if (discountAmount > 0) {
        orderData.discount_amount = discountAmount;
      }
      if (couponId) {
        orderData.coupon_id = couponId;
      }

      // Add shipping address fields
      if (shippingAddress) orderData.shipping_address = shippingAddress;
      if (shippingCity) orderData.shipping_city = shippingCity;
      if (shippingPostalCode) orderData.shipping_postal_code = shippingPostalCode;
      if (shippingCountry) orderData.shipping_country = shippingCountry;
      if (shippingPhone) orderData.shipping_phone = shippingPhone;
      if (buyerName) orderData.buyer_name = buyerName;

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        console.error("Failed to create order:", orderError);
        return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
      }

      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent &&
              typeof session.payment_intent === "object" &&
              "id" in session.payment_intent
            ? (session.payment_intent as Stripe.PaymentIntent).id
            : null;
      if (paymentIntentId && order?.id) {
        await supabase
          .from("orders")
          .update({ stripe_payment_intent_id: paymentIntentId })
          .eq("id", order.id);
      }

      await fulfillProductAfterSale(supabase, productId);

      if (couponId) {
        await incrementCouponRedemption(supabase, couponId);
      }

      const { empireDispatch } = await import("@/lib/empire-os/dispatch");
      const { enrichOrderPaidPayload } = await import("@/lib/empire-os/enrich");
      const paidPayload = await enrichOrderPaidPayload(supabase, {
        amount,
        discount_amount: discountAmount,
        stripe_session_id: session.id,
        buyer_id: buyerId,
        seller_id: sellerId,
      });
      void empireDispatch({
        event_type: "order.paid",
        payload: paidPayload,
        actor_user_id: buyerId,
        product_id: productId,
        order_id: order.id,
      }).catch((e) => console.error("[empire_os]", e));

      // If this was from an accepted offer, mark the offer as completed
      const { data: acceptedOffer } = await supabase
        .from("offers")
        .select("id")
        .eq("product_id", productId)
        .eq("buyer_id", buyerId)
        .eq("status", "accepted")
        .maybeSingle();

      if (acceptedOffer) {
        await supabase
          .from("offers")
          .update({ status: "completed" })
          .eq("id", acceptedOffer.id);
      }

      // Fetch complete order information for emails
      const { data: productData } = await supabase
        .from("products")
        .select("name, brand, condition, size, price")
        .eq("id", productId)
        .single();

      const { data: sellerAuthUser } = await supabase.auth.admin.getUserById(sellerId);
      const sellerEmail = sellerAuthUser?.user?.email;
      const { data: sellerData } = await supabase
        .from("sellers")
        .select("username")
        .eq("user_id", sellerId)
        .maybeSingle();

      const { data: buyerAuthUser } = await supabase.auth.admin.getUserById(buyerId);
      const buyerEmail = buyerAuthUser?.user?.email;
      const { data: buyerData } = await supabase
        .from("buyers")
        .select("username")
        .eq("user_id", buyerId)
        .maybeSingle();

      const { getSiteBaseUrl } = await import("@/lib/site-url");
      const appUrl = getSiteBaseUrl();

      try {
        const { sendEmail } = await import("@/lib/email");
        const { tplOrderPlacedSeller, tplOrderPlacedBuyer, tplAdminNewOrder } = await import(
          "@/lib/email-templates"
        );

        const shippingBlock = [
          buyerName || buyerEmail || "Buyer",
          shippingAddress,
          `${shippingCity} ${shippingPostalCode}`,
          shippingCountry,
          shippingPhone ? `Phone: ${shippingPhone}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        const buyerAddr = buyerEmail || session.customer_details?.email || "";

        if (sellerEmail) {
          await sendEmail({
            to: sellerEmail,
            ...tplOrderPlacedSeller({
              orderId: order.id,
              productName: productData?.name || "Product",
              amount,
              buyerLabel: buyerName || buyerAddr || "Buyer",
              shippingBlock,
            }),
          });
        }

        if (buyerAddr) {
          await sendEmail({
            to: buyerAddr,
            ...tplOrderPlacedBuyer({
              orderId: order.id,
              productName: productData?.name || "Product",
              amount,
              shippingSummary: shippingBlock,
            }),
          });
        }

        const adminEmail = process.env.ADMIN_EMAIL ?? process.env.SMTP_USER ?? "";
        if (adminEmail) {
          await sendEmail({
            to: adminEmail,
            ...tplAdminNewOrder({
              orderId: order.id,
              productName: productData?.name || "N/A",
              amount,
              stripeSessionId: session.id,
              paymentMode: "Stripe Checkout",
              sellerSummary: `${sellerData?.username ?? "—"} (${sellerEmail ?? "—"})`,
              buyerSummary: `${buyerName ?? buyerData?.username ?? "—"} (${buyerAddr})`,
              shippingBlock,
            }),
          });
        }
      } catch (emailError) {
        console.error("Failed to send order notification emails:", emailError);
      }
    }
  }

  return NextResponse.json({ received: true });
}
