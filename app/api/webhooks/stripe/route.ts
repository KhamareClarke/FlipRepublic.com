import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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

    if (productId && sellerId && buyerId) {
      const supabase = createSupabaseAdminClient();
      
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
      };

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

      // Mark product as sold
      await supabase
        .from("products")
        .update({ status: "sold" })
        .eq("id", productId);

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

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

      // Send email notification to seller
      try {
        const { sendEmail } = await import("@/lib/email");
        
        if (sellerEmail) {
          await sendEmail({
            to: sellerEmail,
            subject: "New Order Received - FlipRepublic",
            text: `You have received a new order!

Order ID: ${order.id}
Product: ${productData?.name || "Product"}
Amount: £${amount}
Buyer: ${buyerName || buyerEmail || "Buyer"}

Shipping Address:
${buyerName || ""}
${shippingAddress}
${shippingCity} ${shippingPostalCode}
${shippingCountry}
${shippingPhone ? `Phone: ${shippingPhone}` : ""}

Please log in to your seller dashboard to view full order details and update the shipping status:
${appUrl}/dashboard

Thank you!`,
          });
        }
      } catch (emailError) {
        console.error("Failed to send seller notification:", emailError);
        // Don't fail the webhook if email fails
      }

      // Send email notification to admin
      try {
        const { sendEmail } = await import("@/lib/email");
        const adminEmail = process.env.ADMIN_EMAIL ?? process.env.SMTP_USER ?? "";
        
        if (adminEmail) {
          await sendEmail({
            to: adminEmail,
            subject: "New Payment Received - Order Complete - FlipRepublic",
            text: `A new payment has been received and order has been completed.

═══════════════════════════════════════════════════════
ORDER INFORMATION
═══════════════════════════════════════════════════════

Order ID: ${order.id}
Stripe Session ID: ${session.id}
Order Status: Paid
Payment Date: ${new Date().toLocaleString("en-GB")}

═══════════════════════════════════════════════════════
PRODUCT DETAILS
═══════════════════════════════════════════════════════

Product Name: ${productData?.name || "N/A"}
Brand: ${productData?.brand || "N/A"}
Condition: ${productData?.condition || "N/A"}
Size: ${productData?.size || "N/A"}
Listed Price: £${productData?.price || "N/A"}
Sold Price: £${amount}

═══════════════════════════════════════════════════════
SELLER INFORMATION
═══════════════════════════════════════════════════════

Seller Username: ${sellerData?.username || "N/A"}
Seller Email: ${sellerEmail || "N/A"}
Seller ID: ${sellerId}

═══════════════════════════════════════════════════════
BUYER INFORMATION
═══════════════════════════════════════════════════════

Buyer Name: ${buyerName || "N/A"}
Buyer Username: ${buyerData?.username || "N/A"}
Buyer Email: ${buyerEmail || session.customer_details?.email || "N/A"}
Buyer ID: ${buyerId}

═══════════════════════════════════════════════════════
SHIPPING ADDRESS
═══════════════════════════════════════════════════════

${buyerName || buyerEmail || "Buyer"}
${shippingAddress}
${shippingCity}
${shippingPostalCode}
${shippingCountry}
${shippingPhone ? `Phone: ${shippingPhone}` : ""}

═══════════════════════════════════════════════════════
PAYMENT INFORMATION
═══════════════════════════════════════════════════════

Payment Amount: £${amount}
Payment Method: Stripe Checkout
Payment Status: Completed
Currency: GBP

═══════════════════════════════════════════════════════

View order in admin dashboard:
${appUrl}/admin

View order details:
${appUrl}/api/orders/${order.id}

Thank you!`,
          });
        }
      } catch (emailError) {
        console.error("Failed to send admin notification:", emailError);
        // Don't fail the webhook if email fails
      }
    }
  }

  return NextResponse.json({ received: true });
}
