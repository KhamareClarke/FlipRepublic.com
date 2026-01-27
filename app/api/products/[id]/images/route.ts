import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRequestClient } from "@/lib/supabase/request";
import { getUserFromRequest } from "@/lib/supabase/auth";

export async function PUT(request: NextRequest, context: { params: { id: string } }) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = request.headers.get("authorization")?.replace("Bearer ", "");
  const supabase = createSupabaseRequestClient(accessToken);

  // Verify user owns this product
  const { data: product } = await supabase
    .from("products")
    .select("seller_id")
    .eq("id", context.params.id)
    .single();

  if (!product || product.seller_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { images } = await request.json();

  if (!Array.isArray(images)) {
    return NextResponse.json({ error: "Images must be an array." }, { status: 400 });
  }

  // Delete existing images
  await supabase
    .from("product_images")
    .delete()
    .eq("product_id", context.params.id);

  // Insert new images
  if (images.length > 0) {
    const { error } = await supabase.from("product_images").insert(
      images.map((url: string, index: number) => ({
        product_id: context.params.id,
        url,
        sort_order: index,
      }))
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
