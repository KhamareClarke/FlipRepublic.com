import type { SupabaseClient } from "@supabase/supabase-js";

export type CouponRow = {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  seller_id: string | null;
  product_id: string | null;
  min_order_amount: number;
  max_redemptions: number | null;
  redemption_count: number;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
};

export function computeDiscountAmount(subtotal: number, coupon: CouponRow): number {
  const minOrder = Number(coupon.min_order_amount ?? 0);
  if (subtotal < minOrder) return 0;

  if (coupon.discount_type === "percent") {
    const pct = Math.min(100, Math.max(0, Number(coupon.discount_value)));
    const raw = (subtotal * pct) / 100;
    return Math.round(raw * 100) / 100;
  }

  return Math.min(subtotal, Math.round(Number(coupon.discount_value) * 100) / 100);
}

export type ValidateCouponInput = {
  code: string;
  productId: string;
  sellerId: string;
  subtotal: number;
};

export type ValidateCouponResult =
  | { ok: true; coupon: CouponRow; discountAmount: number; finalAmount: number }
  | { ok: false; error: string };

export async function validateCouponForCheckout(
  supabase: SupabaseClient,
  input: ValidateCouponInput
): Promise<ValidateCouponResult> {
  const raw = (input.code ?? "").trim();
  if (!raw) {
    return { ok: false, error: "Coupon code is required." };
  }

  const normalized = raw.toLowerCase();
  const { data: coupon, error } = await supabase.from("coupons").select("*").eq("code", normalized).maybeSingle();

  if (error || !coupon) {
    return { ok: false, error: "Invalid or expired coupon." };
  }

  const c = coupon as CouponRow;
  if (!c.active) {
    return { ok: false, error: "This coupon is not active." };
  }

  const now = new Date();
  if (c.starts_at && new Date(c.starts_at) > now) {
    return { ok: false, error: "This coupon is not valid yet." };
  }
  if (c.ends_at && new Date(c.ends_at) < now) {
    return { ok: false, error: "This coupon has expired." };
  }

  if (c.max_redemptions != null && c.redemption_count >= c.max_redemptions) {
    return { ok: false, error: "This coupon has reached its usage limit." };
  }

  if (c.seller_id != null && c.seller_id !== input.sellerId) {
    return { ok: false, error: "This coupon does not apply to this seller." };
  }

  if (c.product_id != null && c.product_id !== input.productId) {
    return { ok: false, error: "This coupon does not apply to this product." };
  }

  const discountAmount = computeDiscountAmount(input.subtotal, c);
  if (discountAmount <= 0) {
    return { ok: false, error: "Order total is too low for this coupon." };
  }

  const finalAmount = Math.round((input.subtotal - discountAmount) * 100) / 100;
  if (finalAmount < 0) {
    return { ok: false, error: "Invalid discount." };
  }

  return { ok: true, coupon: c, discountAmount, finalAmount };
}

export async function incrementCouponRedemption(
  supabase: SupabaseClient,
  couponId: string
): Promise<void> {
  const { data: row } = await supabase.from("coupons").select("redemption_count").eq("id", couponId).maybeSingle();
  if (!row) return;
  await supabase
    .from("coupons")
    .update({ redemption_count: Number(row.redemption_count ?? 0) + 1 })
    .eq("id", couponId);
}
