import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRequestClient } from "@/lib/supabase/request";
import { getUserFromRequest } from "@/lib/supabase/auth";

export async function GET(_request: NextRequest, context: { params: { id: string } }) {
  const supabase = createSupabaseRequestClient();
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
    .eq("id", context.params.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  return NextResponse.json({ product: data });
}

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
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

  const payload = await request.json();

  const { data, error } = await supabase
    .from("products")
    .update(payload)
    .eq("id", context.params.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: data });
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
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

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", context.params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
