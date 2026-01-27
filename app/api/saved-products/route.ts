import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRequestClient } from "@/lib/supabase/request";
import { getUserFromRequest } from "@/lib/supabase/auth";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = request.headers.get("authorization")?.replace("Bearer ", "");
  const supabase = createSupabaseRequestClient(accessToken);
  const { data, error } = await supabase
    .from("saved_products")
    .select(
      `
        product:products(
          *,
          images:product_images(*),
          seller:sellers(user_id, username, role, is_admin_approved),
          category:categories(*)
        ),
        created_at
      `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ savedProducts: data ?? [] });
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const { productId } = payload;

  if (!productId) {
    return NextResponse.json({ error: "Product required." }, { status: 400 });
  }

  const accessToken = request.headers.get("authorization")?.replace("Bearer ", "");
  const supabase = createSupabaseRequestClient(accessToken);
  const { data, error } = await supabase
    .from("saved_products")
    .insert({ user_id: user.id, product_id: productId })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ savedProduct: data });
}

export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");

  if (!productId) {
    return NextResponse.json({ error: "Product required." }, { status: 400 });
  }

  const accessToken = request.headers.get("authorization")?.replace("Bearer ", "");
  const supabase = createSupabaseRequestClient(accessToken);
  const { error } = await supabase
    .from("saved_products")
    .delete()
    .eq("user_id", user.id)
    .eq("product_id", productId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
