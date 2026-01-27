import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileForUser, getUserFromRequest } from "@/lib/supabase/auth";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfileForUser(user.id);

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `
        *,
        images:product_images(*),
        seller:sellers(user_id, username, role, is_admin_approved),
        category:categories(*)
      `
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Enrich products with seller email
  const productsWithSellerEmail = await Promise.all(
    (data ?? []).map(async (product) => {
      if (product.seller?.user_id) {
        const { data: authUser } = await supabase.auth.admin.getUserById(product.seller.user_id);
        return {
          ...product,
          seller: {
            ...product.seller,
            email: authUser?.user?.email || null,
          },
        };
      }
      return product;
    })
  );

  return NextResponse.json({ products: productsWithSellerEmail });
}
