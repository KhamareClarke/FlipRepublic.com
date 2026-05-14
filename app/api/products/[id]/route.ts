import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRequestClient } from "@/lib/supabase/request";
import { getUserFromRequest } from "@/lib/supabase/auth";
import { normalizeProductSeller } from "@/lib/product-serialize";
import { findBannedListingTerms } from "@/lib/content-filter";

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

  return NextResponse.json({ product: normalizeProductSeller(data) });
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

  const textCheck = [payload.name, payload.brand, payload.description, payload.colorway].filter(Boolean).join(" ");
  const banned = findBannedListingTerms(textCheck);
  if (banned.length > 0) {
    return NextResponse.json(
      { error: "Listing contains blocked terms.", terms: banned },
      { status: 400 }
    );
  }

  const allowed: Record<string, unknown> = {};
  const keys = [
    "name",
    "brand",
    "condition",
    "size",
    "price",
    "category_id",
    "description",
    "colorway",
    "release_year",
    "authenticated",
    "status",
    "sku",
    "stock_quantity",
    "track_inventory",
  ] as const;
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(payload, k)) {
      allowed[k] = payload[k];
    }
  }

  if (allowed.price != null) {
    allowed.price = Number(allowed.price);
  }
  if (allowed.release_year != null) {
    allowed.release_year = allowed.release_year === "" ? null : parseInt(String(allowed.release_year), 10);
  }
  if (allowed.stock_quantity != null) {
    allowed.stock_quantity = Math.max(0, Math.floor(Number(allowed.stock_quantity)));
  }
  if (allowed.track_inventory != null) {
    allowed.track_inventory = Boolean(allowed.track_inventory);
  }
  if (typeof allowed.sku === "string") {
    const t = allowed.sku.trim();
    allowed.sku = t.length ? t : null;
  }

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("products")
    .update(allowed)
    .eq("id", context.params.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const stockTouched =
    Object.prototype.hasOwnProperty.call(allowed, "stock_quantity") ||
    Object.prototype.hasOwnProperty.call(allowed, "track_inventory");
  if (stockTouched) {
    const { empireDispatch } = await import("@/lib/empire-os/dispatch");
    const st = Number(data.stock_quantity ?? 0);
    const tr = Boolean(data.track_inventory);
    const et = tr && st > 0 && st <= 2 ? "listing.low_stock" : "listing.inventory_updated";
    void empireDispatch({
      event_type: et,
      payload: { stock_quantity: st, track_inventory: tr, name: data.name, status: data.status },
      actor_user_id: user.id,
      product_id: data.id,
    }).catch((e) => console.error("[empire_os]", e));
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
