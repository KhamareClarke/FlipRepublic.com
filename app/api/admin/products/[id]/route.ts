import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileForUser, getUserFromRequest } from "@/lib/supabase/auth";
import { sendEmail } from "@/lib/email";
import { logAdminAction } from "@/lib/admin-audit";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfileForUser(user.id);

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json();
  const supabase = createSupabaseAdminClient();
  
  // Get current product to check status change
  const { data: currentProduct } = await supabase
    .from("products")
    .select("status, seller_id, name, brand, price")
    .eq("id", context.params.id)
    .single();
  
  const { data, error } = await supabase
    .from("products")
    .update(payload)
    .eq("id", context.params.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAdminAction(user.id, "admin_product_patch", "products", context.params.id, { payload });

  // Send email to seller if status changed to "active"
  if (payload.status === "active" && currentProduct && currentProduct.status !== "active") {
    try {
      // Get seller info
      const { data: seller } = await supabase
        .from("sellers")
        .select("user_id, username")
        .eq("user_id", currentProduct.seller_id)
        .single();
      
      if (seller) {
        const { data: authUser } = await supabase.auth.admin.getUserById(seller.user_id);
        const sellerEmail = authUser?.user?.email;
        const sellerName = seller.username || sellerEmail?.split("@")[0] || "Seller";
        
        if (sellerEmail) {
          const { getSiteBaseUrl } = await import("@/lib/site-url");
          const baseUrl = getSiteBaseUrl();
          await sendEmail({
            to: sellerEmail,
            subject: "Your Product Listing is Now Live! 🎉",
            text: `Congratulations ${sellerName}!

Your product listing has been approved and is now live on the marketplace.

Product: ${currentProduct.name}
Brand: ${currentProduct.brand}
Price: £${currentProduct.price}

View your listing:
${baseUrl}/product/${context.params.id}

Manage your listings:
${baseUrl}/dashboard

Your product is now visible to all buyers on FlipRepublic. Good luck with your sale!

Best regards,
FlipRepublic Team`,
          });
        }
      }
    } catch (emailError) {
      console.error("Failed to send seller notification:", emailError);
      // Don't fail the update if email fails
    }
  }

  return NextResponse.json({ product: data });
}
