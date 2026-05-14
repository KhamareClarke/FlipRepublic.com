import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRequestClient } from "@/lib/supabase/request";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserFromRequest } from "@/lib/supabase/auth";
import { escrowFieldsForNewOrder } from "@/lib/escrow";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view"); // "buyer" or "seller" - defaults to buyer
  const sessionId = searchParams.get("session_id");

  const accessToken = request.headers.get("authorization")?.replace("Bearer ", "");
  const supabase = createSupabaseRequestClient(accessToken);
  
  // Get orders based on view type
  let query = supabase
    .from("orders")
    .select(
      `
        *,
        product:products(
          *,
          images:product_images(*)
        ),
        seller:sellers(user_id, username, role, is_admin_approved)
      `
    );
  
  // Note: Shipping address fields (shipping_address, shipping_city, shipping_postal_code, 
  // shipping_country, shipping_phone, buyer_name) are included in the * selector

  // If session_id is provided, filter by it (for checkout success page)
  if (sessionId) {
    query = query.eq("stripe_session_id", sessionId);
  } else {
    // Otherwise, filter by buyer/seller
    if (view === "seller") {
      // For seller dashboard - show orders where user is the seller
      query = query.eq("seller_id", user.id);
    } else {
      // For account page - show orders where user is the buyer
      query = query.eq("buyer_id", user.id);
    }
  }

  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ orders: data ?? [] });
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const { productId, amount, stripeSessionId } = payload;

  if (!productId || !amount) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: product } = await supabase
    .from("products")
    .select("id, seller_id, status")
    .eq("id", productId)
    .maybeSingle();

  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  if (product.status !== "active") {
    return NextResponse.json({ error: "Product is not available." }, { status: 400 });
  }
  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      buyer_id: user.id,
      seller_id: product.seller_id,
      product_id: productId,
      amount,
      status: "paid",
      stripe_session_id: stripeSessionId ?? null,
      ...escrowFieldsForNewOrder(),
    })
    .select("*")
    .single();

  if (error || !order) {
    return NextResponse.json({ error: error?.message ?? "Order creation failed." }, { status: 500 });
  }

  await supabase.from("products").update({ status: "sold" }).eq("id", productId);

  return NextResponse.json({ order });
}
