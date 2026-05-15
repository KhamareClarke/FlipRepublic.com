import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRequestClient } from "@/lib/supabase/request";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserFromRequest } from "@/lib/supabase/auth";
import { sendEmail } from "@/lib/email";
import { tplOfferNewSeller } from "@/lib/email-templates";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = request.headers.get("authorization")?.replace("Bearer ", "");
  const supabase = createSupabaseRequestClient(accessToken);
  const { data, error } = await supabase
    .from("offers")
    .select(
      `
        *,
        product:products(
          *,
          images:product_images(*)
        ),
        seller:sellers(user_id, username, role)
      `
    )
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  // Enrich offers with buyer email (for sellers)
  const supabaseAdmin = createSupabaseAdminClient();
  const enrichedOffers = await Promise.all(
    (data ?? []).map(async (offer) => {
      if (offer.buyer_id && offer.seller_id === user.id) {
        // Seller viewing - get buyer email
        const { data: buyerAuthUser } = await supabaseAdmin.auth.admin.getUserById(offer.buyer_id);
        return {
          ...offer,
          buyer_email: buyerAuthUser?.user?.email || null,
        };
      }
      return offer;
    })
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ offers: enrichedOffers });
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const { productId, offerPrice } = payload;

  if (!productId || !offerPrice) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const accessToken = request.headers.get("authorization")?.replace("Bearer ", "");
  const supabase = createSupabaseRequestClient(accessToken);
  const { data: product } = await supabase
    .from("products")
    .select("id, seller_id")
    .eq("id", productId)
    .maybeSingle();

  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  // Check if buyer already has a pending offer on this product
  const { data: existingOffer } = await supabase
    .from("offers")
    .select("id, status")
    .eq("product_id", productId)
    .eq("buyer_id", user.id)
    .in("status", ["pending", "accepted"])
    .maybeSingle();

  if (existingOffer) {
    if (existingOffer.status === "pending") {
      return NextResponse.json({ 
        error: "You already have a pending offer on this product. Please wait for the seller to respond.",
        code: "DUPLICATE_OFFER"
      }, { status: 400 });
    } else if (existingOffer.status === "accepted") {
      return NextResponse.json({ 
        error: "You already have an accepted offer on this product. Please complete your purchase.",
        code: "OFFER_ALREADY_ACCEPTED"
      }, { status: 400 });
    }
  }

  // Get product details for email
  const { data: productDetails } = await supabase
    .from("products")
    .select("name, brand, price")
    .eq("id", productId)
    .single();

  const { data, error } = await supabase
    .from("offers")
    .insert({
      product_id: productId,
      buyer_id: user.id,
      seller_id: product.seller_id,
      offer_price: offerPrice,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send email notification to seller
  try {
    const supabaseAdmin = createSupabaseAdminClient();
    
    // Get seller email
    const { data: seller } = await supabase
      .from("sellers")
      .select("user_id, username")
      .eq("user_id", product.seller_id)
      .single();
    
    if (seller) {
      const { data: sellerAuthUser } = await supabaseAdmin.auth.admin.getUserById(seller.user_id);
      const sellerEmail = sellerAuthUser?.user?.email;
      
      // Get buyer email
      const { data: buyerAuthUser } = await supabaseAdmin.auth.admin.getUserById(user.id);
      const buyerEmail = buyerAuthUser?.user?.email || "Buyer";
      
      if (sellerEmail) {
        const mail = tplOfferNewSeller({
          productName: productDetails?.name || "Product",
          brand: productDetails?.brand,
          listPrice: productDetails?.price ?? 0,
          offerPrice,
          buyerLabel: buyerEmail,
        });
        await sendEmail({ to: sellerEmail, ...mail });
      }
    }
  } catch (emailError) {
    console.error("Failed to send seller notification:", emailError);
    // Don't fail the offer creation if email fails
  }

  const listPrice = Number(productDetails?.price ?? 0);
  const ratio = listPrice > 0 ? Number(offerPrice) / listPrice : 1;
  const { empireDispatch } = await import("@/lib/empire-os/dispatch");
  void empireDispatch({
    event_type: "offer.created",
    payload: {
      offer_id: data.id,
      offer_price: offerPrice,
      ratio_to_list: ratio,
      seller_id: product.seller_id,
    },
    actor_user_id: user.id,
    product_id: productId,
  }).catch((e) => console.error("[empire_os]", e));

  return NextResponse.json({ offer: data });
}
