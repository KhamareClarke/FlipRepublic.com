import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { validateCouponForCheckout } from "@/lib/coupons";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { code, productId, subtotal } = body;

  if (!productId || typeof productId !== "string") {
    return NextResponse.json({ error: "productId required." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: product, error } = await supabase
    .from("products")
    .select("id, seller_id, price, status")
    .eq("id", productId)
    .maybeSingle();

  if (error || !product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const base = subtotal != null ? Number(subtotal) : Number(product.price);
  if (!Number.isFinite(base) || base <= 0) {
    return NextResponse.json({ error: "Invalid subtotal." }, { status: 400 });
  }

  const result = await validateCouponForCheckout(supabase, {
    code: String(code ?? ""),
    productId: product.id,
    sellerId: product.seller_id,
    subtotal: base,
  });

  if (!result.ok) {
    return NextResponse.json({ valid: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    valid: true,
    discountAmount: result.discountAmount,
    finalAmount: result.finalAmount,
    couponId: result.coupon.id,
  });
}
