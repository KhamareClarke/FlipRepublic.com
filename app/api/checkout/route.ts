import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { escrowFieldsForNewOrder } from "@/lib/escrow";
import { getUserFromRequest } from "@/lib/supabase/auth";
import { validateCouponForCheckout, incrementCouponRedemption } from "@/lib/coupons";
import { fulfillProductAfterSale, isProductPurchasable } from "@/lib/product-inventory";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY ?? "";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const MIN_STRIPE_GBP = 0.3;

type CheckoutPaymentMethodOpts =
  | { payment_method_types: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] }
  | { automatic_payment_methods: { enabled: boolean } };

function buildPaymentMethodOptions(): CheckoutPaymentMethodOpts {
  if (process.env.STRIPE_CHECKOUT_AUTOMATIC_PAYMENT_METHODS === "true") {
    return { automatic_payment_methods: { enabled: true } };
  }
  const types: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = ["card", "link"];
  if (process.env.STRIPE_CHECKOUT_PAYPAL === "true") {
    types.push("paypal");
  }
  return { payment_method_types: types };
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const {
    productId,
    amount,
    shippingAddress,
    shippingCity,
    shippingPostalCode,
    shippingCountry,
    shippingPhone,
    buyerName,
    couponCode,
  } = payload;

  if (!productId) {
    return NextResponse.json({ error: "Product required." }, { status: 400 });
  }

  const useFreePayment = process.env.USE_FREE_PAYMENT === "true";
  if (!useFreePayment && !stripeSecretKey) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 500 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: product, error } = await supabase
    .from("products")
    .select("id, name, price, seller_id, status, track_inventory, stock_quantity")
    .eq("id", productId)
    .single();

  if (error || !product) {
    return NextResponse.json({ error: error?.message ?? "Product not found." }, { status: 404 });
  }
  if (!isProductPurchasable(product)) {
    return NextResponse.json({ error: "Product is not available or out of stock." }, { status: 400 });
  }

  const purchaseAmount = amount ? Number(amount) : Number(product.price);

  if (!purchaseAmount || purchaseAmount <= 0) {
    return NextResponse.json({ error: "Invalid purchase amount." }, { status: 400 });
  }

  if (amount) {
    const { data: offer } = await supabase
      .from("offers")
      .select("id, status, offer_price")
      .eq("product_id", productId)
      .eq("buyer_id", user.id)
      .eq("status", "accepted")
      .maybeSingle();

    if (!offer) {
      return NextResponse.json({ error: "Invalid offer or offer not found." }, { status: 400 });
    }

    if (Math.abs(Number(offer.offer_price) - purchaseAmount) > 0.01) {
      return NextResponse.json({ error: "Offer amount mismatch." }, { status: 400 });
    }
  }

  if (!shippingAddress || !shippingCity || !shippingPostalCode) {
    return NextResponse.json({ error: "Shipping address is required." }, { status: 400 });
  }

  const { empireDispatch: dispatchCheckout } = await import("@/lib/empire-os/dispatch");
  void dispatchCheckout({
    event_type: "checkout.started",
    payload: { amount: purchaseAmount, product_id: productId },
    actor_user_id: user.id,
    product_id: productId,
  }).catch((e) => console.error("[empire_os]", e));

  let finalAmount = Math.round(purchaseAmount * 100) / 100;
  let discountAmount = 0;
  let couponId: string | null = null;

  if (couponCode && String(couponCode).trim()) {
    const v = await validateCouponForCheckout(supabase, {
      code: String(couponCode),
      productId,
      sellerId: product.seller_id,
      subtotal: purchaseAmount,
    });
    if (!v.ok) {
      return NextResponse.json({ error: v.error }, { status: 400 });
    }
    discountAmount = v.discountAmount;
    finalAmount = v.finalAmount;
    couponId = v.coupon.id;
  }

  if (useFreePayment) {
    const supabaseAdmin = createSupabaseAdminClient();

    const orderData: Record<string, unknown> = {
      buyer_id: user.id,
      seller_id: product.seller_id,
      product_id: productId,
      amount: finalAmount,
      status: "paid",
      ...escrowFieldsForNewOrder(),
    };

    if (discountAmount > 0) {
      orderData.discount_amount = discountAmount;
    }
    if (couponId) {
      orderData.coupon_id = couponId;
    }

    if (shippingAddress) orderData.shipping_address = shippingAddress;
    if (shippingCity) orderData.shipping_city = shippingCity;
    if (shippingPostalCode) orderData.shipping_postal_code = shippingPostalCode;
    if (shippingCountry) orderData.shipping_country = shippingCountry || "United Kingdom";
    if (shippingPhone) orderData.shipping_phone = shippingPhone;
    if (buyerName) orderData.buyer_name = buyerName;

    const { data: order, error: orderError } = await supabaseAdmin.from("orders").insert(orderData).select().single();

    if (orderError || !order) {
      return NextResponse.json({ error: orderError?.message ?? "Failed to create order." }, { status: 500 });
    }

    await fulfillProductAfterSale(supabaseAdmin, productId);

    if (couponId) {
      await incrementCouponRedemption(supabaseAdmin, couponId);
    }

    const { empireDispatch } = await import("@/lib/empire-os/dispatch");
    const { enrichOrderPaidPayload } = await import("@/lib/empire-os/enrich");
    const paidPayload = await enrichOrderPaidPayload(supabaseAdmin, {
      amount: finalAmount,
      discount_amount: discountAmount,
      mode: "free_checkout",
      buyer_id: user.id,
      seller_id: product.seller_id,
    });
    void empireDispatch({
      event_type: "order.paid",
      payload: paidPayload,
      actor_user_id: user.id,
      product_id: productId,
      order_id: order.id,
    }).catch((e) => console.error("[empire_os]", e));

    if (amount) {
      const { data: acceptedOffer } = await supabaseAdmin
        .from("offers")
        .select("id")
        .eq("product_id", productId)
        .eq("buyer_id", user.id)
        .eq("status", "accepted")
        .maybeSingle();

      if (acceptedOffer) {
        await supabaseAdmin.from("offers").update({ status: "completed" }).eq("id", acceptedOffer.id);
      }
    }

    const { data: fullProduct } = await supabaseAdmin
      .from("products")
      .select("name, brand, condition, size, price")
      .eq("id", productId)
      .single();

    const { data: sellerAuthUser } = await supabaseAdmin.auth.admin.getUserById(product.seller_id);
    const sellerEmail = sellerAuthUser?.user?.email;
    const { data: sellerData } = await supabaseAdmin
      .from("sellers")
      .select("username")
      .eq("user_id", product.seller_id)
      .maybeSingle();

    const { data: buyerAuthUser } = await supabaseAdmin.auth.admin.getUserById(user.id);
    const buyerEmail = buyerAuthUser?.user?.email || user.email;
    const { data: buyerData } = await supabaseAdmin
      .from("buyers")
      .select("username")
      .eq("user_id", user.id)
      .maybeSingle();

    try {
      const { sendEmail } = await import("@/lib/email");
      const { tplOrderPlacedSeller, tplOrderPlacedBuyer, tplAdminNewOrder } = await import("@/lib/email-templates");

      const shippingBlock = [
        buyerName || buyerEmail,
        shippingAddress,
        `${shippingCity} ${shippingPostalCode}`,
        shippingCountry || "United Kingdom",
        shippingPhone ? `Phone: ${shippingPhone}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const soldPrice = finalAmount;

      if (sellerEmail) {
        await sendEmail({
          to: sellerEmail,
          ...tplOrderPlacedSeller({
            orderId: order.id,
            productName: product.name,
            amount: soldPrice,
            buyerLabel: buyerName || buyerEmail,
            shippingBlock,
          }),
        });
      }

      if (buyerEmail) {
        await sendEmail({
          to: buyerEmail,
          ...tplOrderPlacedBuyer({
            orderId: order.id,
            productName: fullProduct?.name || product.name,
            amount: soldPrice,
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
            productName: fullProduct?.name || product.name || "N/A",
            amount: soldPrice,
            stripeSessionId: null,
            paymentMode: "Free (Testing)",
            sellerSummary: `${sellerData?.username ?? "—"} (${sellerEmail ?? "—"})`,
            buyerSummary: `${buyerName ?? buyerData?.username ?? "—"} (${buyerEmail})`,
            shippingBlock,
          }),
        });
      }
    } catch (emailError) {
      console.error("Failed to send order notification emails:", emailError);
    }

    return NextResponse.json({
      success: true,
      order: order,
      url: `${appUrl}/checkout/success?order_id=${order.id}`,
    });
  }

  if (finalAmount < MIN_STRIPE_GBP) {
    return NextResponse.json(
      { error: `Amount after discount must be at least £${MIN_STRIPE_GBP.toFixed(2)} for card checkout.` },
      { status: 400 }
    );
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2024-06-20" as any,
  });

  const { data: fullProduct } = await supabase
    .from("products")
    .select("brand, condition, size")
    .eq("id", productId)
    .single();

  const productDescription = `${fullProduct?.brand || ""} ${fullProduct?.condition || ""} ${fullProduct?.size || ""}`.trim();

  const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = {
    price_data: {
      currency: "gbp",
      product_data: {
        name: product.name,
      },
      unit_amount: Math.round(finalAmount * 100),
    },
    quantity: 1,
  };

  if (productDescription) {
    lineItem.price_data!.product_data!.description = productDescription;
  }

  const metadata: Record<string, string> = {
    product_id: product.id,
    seller_id: product.seller_id,
    amount: finalAmount.toString(),
    list_amount: purchaseAmount.toString(),
    buyer_id: user.id,
    shipping_address: shippingAddress,
    shipping_city: shippingCity,
    shipping_postal_code: shippingPostalCode,
    shipping_country: shippingCountry || "United Kingdom",
    shipping_phone: shippingPhone || "",
    buyer_name: buyerName || "",
    discount_amount: discountAmount.toString(),
    coupon_id: couponId ?? "",
  };

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    ...buildPaymentMethodOptions(),
    customer_email: user.email ?? undefined,
    line_items: [lineItem],
    metadata,
    success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/product/${product.id}`,
  });

  return NextResponse.json({ url: session.url });
}
