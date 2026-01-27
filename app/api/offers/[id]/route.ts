import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRequestClient } from "@/lib/supabase/request";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserFromRequest } from "@/lib/supabase/auth";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const { status } = payload;

  if (!status) {
    return NextResponse.json({ error: "Missing status." }, { status: 400 });
  }

  const accessToken = request.headers.get("authorization")?.replace("Bearer ", "");
  const supabase = createSupabaseRequestClient(accessToken);
  
  // Get current offer with product details
  const { data: currentOffer } = await supabase
    .from("offers")
    .select(`
      *,
      product:products(name, brand, price)
    `)
    .eq("id", context.params.id)
    .single();
  
  if (!currentOffer) {
    return NextResponse.json({ error: "Offer not found." }, { status: 404 });
  }
  
  // Verify user is the seller
  if (currentOffer.seller_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized. Only the seller can update offers." }, { status: 403 });
  }
  
  const { data, error } = await supabase
    .from("offers")
    .update({ status })
    .eq("id", context.params.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send email notification to buyer
  try {
    const supabaseAdmin = createSupabaseAdminClient();
    
    // Get buyer email
    const { data: buyerAuthUser } = await supabaseAdmin.auth.admin.getUserById(currentOffer.buyer_id);
    const buyerEmail = buyerAuthUser?.user?.email;
    
    // Get seller info
    const { data: seller } = await supabase
      .from("sellers")
      .select("username")
      .eq("user_id", user.id)
      .single();
    
    if (buyerEmail) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      const sellerName = seller?.username || "Seller";
      const productName = currentOffer.product?.name || "Product";
      
      if (status === "accepted") {
        await sendEmail({
          to: buyerEmail,
          subject: "Your Offer Has Been Accepted! 🎉",
          text: `Great news! Your offer has been accepted!

Product: ${productName}
Brand: ${currentOffer.product?.brand || "N/A"}
Your Offer: £${currentOffer.offer_price}
Listed Price: £${currentOffer.product?.price || "0"}

Seller: ${sellerName}

Next steps:
1. Complete your purchase
2. View the product: ${baseUrl}/product/${currentOffer.product_id}

Thank you for shopping with FlipRepublic!`,
        });
      } else if (status === "rejected") {
        await sendEmail({
          to: buyerEmail,
          subject: "Offer Update - FlipRepublic",
          text: `Your offer has been reviewed.

Product: ${productName}
Brand: ${currentOffer.product?.brand || "N/A"}
Your Offer: £${currentOffer.offer_price}

Status: Rejected

The seller has declined your offer. You can:
- Browse other products: ${baseUrl}/marketplace
- Make a new offer on a different item

Thank you for your interest in FlipRepublic.`,
        });
      }
    }
  } catch (emailError) {
    console.error("Failed to send buyer notification:", emailError);
    // Don't fail the update if email fails
  }

  return NextResponse.json({ offer: data });
}
