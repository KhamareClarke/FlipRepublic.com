import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserFromRequest } from "@/lib/supabase/auth";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY ?? "";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!stripeSecretKey) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 500 });
  }

  const payload = await request.json();
  const { productId, amount, shippingAddress, shippingCity, shippingPostalCode, shippingCountry, shippingPhone, buyerName } = payload;

  if (!productId) {
    return NextResponse.json({ error: "Product required." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: product, error } = await supabase
    .from("products")
    .select("id, name, price, seller_id, status")
    .eq("id", productId)
    .single();

  if (error || !product) {
    return NextResponse.json({ error: error?.message ?? "Product not found." }, { status: 404 });
  }
  if (product.status !== "active") {
    return NextResponse.json({ error: "Product is not available." }, { status: 400 });
  }

  // Use provided amount (from accepted offer) or product price
  const purchaseAmount = amount ? Number(amount) : Number(product.price);

  // Validate amount
  if (!purchaseAmount || purchaseAmount <= 0) {
    return NextResponse.json({ error: "Invalid purchase amount." }, { status: 400 });
  }

  // If using offer amount, verify the offer exists and is accepted
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
    
    // Verify offer amount matches
    if (Math.abs(Number(offer.offer_price) - purchaseAmount) > 0.01) {
      return NextResponse.json({ error: "Offer amount mismatch." }, { status: 400 });
    }
  }

  // Validate shipping address if provided
  if (!shippingAddress || !shippingCity || !shippingPostalCode) {
    return NextResponse.json({ error: "Shipping address is required." }, { status: 400 });
  }

  // Only use free payment mode if explicitly enabled via environment variable (for testing)
  // By default, use Stripe for real payments
  const useFreePayment = process.env.USE_FREE_PAYMENT === "true";
  
  // For free payments (testing mode only), create order directly without Stripe
  if (useFreePayment) {
    const supabaseAdmin = createSupabaseAdminClient();
    
    // Create order directly
    // Only include columns that exist in the database
    const orderData: any = {
      buyer_id: user.id,
      seller_id: product.seller_id,
      product_id: productId,
      amount: amount || product.price, // Store original amount even though payment is free
      status: "paid",
    };

    // Add address fields if they exist in the schema
    if (shippingAddress) orderData.shipping_address = shippingAddress;
    if (shippingCity) orderData.shipping_city = shippingCity;
    if (shippingPostalCode) orderData.shipping_postal_code = shippingPostalCode;
    if (shippingCountry) orderData.shipping_country = shippingCountry || "United Kingdom";
    if (shippingPhone) orderData.shipping_phone = shippingPhone;
    if (buyerName) orderData.buyer_name = buyerName;

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert(orderData)
      .select()
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: orderError?.message ?? "Failed to create order." }, { status: 500 });
    }

    // Mark product as sold
    await supabaseAdmin
      .from("products")
      .update({ status: "sold" })
      .eq("id", productId);

    // If this was from an accepted offer, mark it as completed
    if (amount) {
      const { data: acceptedOffer } = await supabaseAdmin
        .from("offers")
        .select("id")
        .eq("product_id", productId)
        .eq("buyer_id", user.id)
        .eq("status", "accepted")
        .maybeSingle();

      if (acceptedOffer) {
        await supabaseAdmin
          .from("offers")
          .update({ status: "completed" })
          .eq("id", acceptedOffer.id);
      }
    }

    // Fetch complete order information for emails
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

    // Send email to seller
    try {
      const { sendEmail } = await import("@/lib/email");
      
      if (sellerEmail) {
        await sendEmail({
          to: sellerEmail,
          subject: "New Order Received - FlipRepublic",
          text: `You have received a new order!

Order ID: ${order.id}
Product: ${product.name}
Amount: £${amount || product.price}
Buyer: ${buyerName || buyerEmail}

Shipping Address:
${buyerName || buyerEmail}
${shippingAddress}
${shippingCity} ${shippingPostalCode}
${shippingCountry || "United Kingdom"}
${shippingPhone ? `Phone: ${shippingPhone}` : ""}

Please log in to your seller dashboard to view full order details and update the shipping status:
${appUrl}/dashboard

Thank you!`,
        });
      }
    } catch (emailError) {
      console.error("Failed to send seller notification:", emailError);
      // Don't fail the order if email fails
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
Order Status: Paid
Payment Date: ${new Date().toLocaleString("en-GB")}
Payment Mode: ${useFreePayment ? "Free (Testing)" : "Stripe"}

═══════════════════════════════════════════════════════
PRODUCT DETAILS
═══════════════════════════════════════════════════════

Product Name: ${fullProduct?.name || product.name || "N/A"}
Brand: ${fullProduct?.brand || "N/A"}
Condition: ${fullProduct?.condition || "N/A"}
Size: ${fullProduct?.size || "N/A"}
Listed Price: £${fullProduct?.price || product.price || "N/A"}
Sold Price: £${amount || product.price}

═══════════════════════════════════════════════════════
SELLER INFORMATION
═══════════════════════════════════════════════════════

Seller Username: ${sellerData?.username || "N/A"}
Seller Email: ${sellerEmail || "N/A"}
Seller ID: ${product.seller_id}

═══════════════════════════════════════════════════════
BUYER INFORMATION
═══════════════════════════════════════════════════════

Buyer Name: ${buyerName || "N/A"}
Buyer Username: ${buyerData?.username || "N/A"}
Buyer Email: ${buyerEmail || "N/A"}
Buyer ID: ${user.id}

═══════════════════════════════════════════════════════
SHIPPING ADDRESS
═══════════════════════════════════════════════════════

${buyerName || buyerEmail || "Buyer"}
${shippingAddress}
${shippingCity}
${shippingPostalCode}
${shippingCountry || "United Kingdom"}
${shippingPhone ? `Phone: ${shippingPhone}` : ""}

═══════════════════════════════════════════════════════
PAYMENT INFORMATION
═══════════════════════════════════════════════════════

Payment Amount: £${amount || product.price}
Payment Method: ${useFreePayment ? "Free Payment (Testing Mode)" : "Stripe Checkout"}
Payment Status: Completed
Currency: GBP

═══════════════════════════════════════════════════════

View order in admin dashboard:
${appUrl}/admin

Thank you!`,
        });
      }
    } catch (emailError) {
      console.error("Failed to send admin notification:", emailError);
      // Don't fail the order if email fails
    }

    return NextResponse.json({ 
      success: true, 
      order: order,
      url: `${appUrl}/checkout/success?order_id=${order.id}` 
    });
  }

  // Use Stripe for real payments
  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2024-06-20" as any, // Stripe API version
  });

  // Build description, but only include if it has content
  // First, we need to fetch the full product details to get brand, condition, size
  const { data: fullProduct } = await supabase
    .from("products")
    .select("brand, condition, size")
    .eq("id", productId)
    .single();

  const productDescription = `${fullProduct?.brand || ""} ${fullProduct?.condition || ""} ${fullProduct?.size || ""}`.trim();
  
  const lineItem: any = {
    price_data: {
      currency: "gbp",
      product_data: {
        name: product.name,
      },
      unit_amount: Math.round(purchaseAmount * 100), // Convert to pence
    },
    quantity: 1,
  };

  // Only add description if it's not empty (Stripe doesn't allow empty strings)
  if (productDescription) {
    lineItem.price_data.product_data.description = productDescription;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: user.email ?? undefined,
    line_items: [lineItem],
    // Shipping address is already collected in the modal, so we don't need Stripe to collect it again
    // shipping_address_collection: {
    //   allowed_countries: ["GB", "US", "CA", "AU", "FR", "DE", "IT", "ES", "NL", "BE", "AT", "CH", "SE", "NO", "DK"],
    // },
    metadata: {
      product_id: product.id,
      seller_id: product.seller_id,
      amount: purchaseAmount.toString(),
      buyer_id: user.id,
      shipping_address: shippingAddress,
      shipping_city: shippingCity,
      shipping_postal_code: shippingPostalCode,
      shipping_country: shippingCountry || "United Kingdom",
      shipping_phone: shippingPhone || "",
      buyer_name: buyerName || "",
    },
    success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/product/${product.id}`,
  });

  return NextResponse.json({ url: session.url });
}
