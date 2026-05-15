import { describe, expect, it } from "vitest";
import { computeDiscountAmount } from "@/lib/coupons";
import type { CouponRow } from "@/lib/coupons";

const base: CouponRow = {
  id: "1",
  code: "test",
  discount_type: "percent",
  discount_value: 10,
  seller_id: null,
  product_id: null,
  min_order_amount: 0,
  max_redemptions: null,
  redemption_count: 0,
  starts_at: null,
  ends_at: null,
  active: true,
};

describe("computeDiscountAmount", () => {
  it("applies percent discount", () => {
    expect(computeDiscountAmount(100, base)).toBe(10);
  });

  it("applies fixed discount capped at subtotal", () => {
    const fixed: CouponRow = { ...base, discount_type: "fixed", discount_value: 150 };
    expect(computeDiscountAmount(100, fixed)).toBe(100);
  });

  it("returns 0 below min order", () => {
    const min: CouponRow = { ...base, min_order_amount: 200 };
    expect(computeDiscountAmount(100, min)).toBe(0);
  });
});
