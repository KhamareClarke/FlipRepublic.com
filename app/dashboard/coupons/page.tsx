"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getAccessToken } from "@/lib/supabase/session";
import { formatPrice } from "@/lib/utils";

export default function SellerCouponsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const token = await getAccessToken();
    if (!token) {
      router.push("/login");
      return;
    }
    const res = await fetch("/api/coupons", { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json();
    setCoupons(data.coupons ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [router]);

  const createCoupon = async () => {
    setSaving(true);
    const token = await getAccessToken();
    if (!token) return;
    const res = await fetch("/api/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        code,
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        max_redemptions: maxRedemptions ? parseInt(maxRedemptions, 10) : null,
        min_order_amount: minOrder ? parseFloat(minOrder) : 0,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setCode("");
      setDiscountValue("");
      void load();
    } else {
      const d = await res.json();
      alert(d.error || "Failed");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black py-24 px-6">
        <p className="text-white/60">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-20 sm:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-10">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-serif text-3xl font-bold text-gradient-luxury">Your coupons</h1>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Dashboard
          </Button>
        </div>
        <p className="text-white/55 text-sm">
          Codes apply only to your listings at checkout. Platform-wide codes are created in admin.
        </p>

        <div className="border border-white/15 rounded-lg p-6 space-y-4 glass-effect">
          <h2 className="text-gold font-semibold">Create seller coupon</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-white/60 text-xs block mb-1">Code</label>
              <input
                className="w-full bg-black border border-white/20 px-3 py-2 text-white text-sm"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="SAVE10"
              />
            </div>
            <div>
              <label className="text-white/60 text-xs block mb-1">Type</label>
              <select
                className="w-full bg-black border border-white/20 px-3 py-2 text-white text-sm"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as "percent" | "fixed")}
              >
                <option value="percent">Percent off</option>
                <option value="fixed">Fixed £ off</option>
              </select>
            </div>
            <div>
              <label className="text-white/60 text-xs block mb-1">Value</label>
              <input
                type="number"
                className="w-full bg-black border border-white/20 px-3 py-2 text-white text-sm"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === "percent" ? "10" : "15"}
              />
            </div>
            <div>
              <label className="text-white/60 text-xs block mb-1">Max uses (optional)</label>
              <input
                type="number"
                className="w-full bg-black border border-white/20 px-3 py-2 text-white text-sm"
                value={maxRedemptions}
                onChange={(e) => setMaxRedemptions(e.target.value)}
                placeholder="Unlimited"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-white/60 text-xs block mb-1">Minimum order £ (optional)</label>
              <input
                type="number"
                className="w-full bg-black border border-white/20 px-3 py-2 text-white text-sm"
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <Button variant="primary" disabled={saving || !code.trim() || !discountValue} onClick={() => void createCoupon()}>
            {saving ? "Saving…" : "Create"}
          </Button>
        </div>

        <div className="space-y-2">
          <h2 className="text-white font-medium">Existing</h2>
          {coupons.length === 0 ? (
            <p className="text-white/50 text-sm">No coupons yet.</p>
          ) : (
            <ul className="space-y-2 text-sm text-white/80">
              {coupons.map((c) => (
                <li key={c.id} className="border border-white/10 rounded px-3 py-2 flex flex-wrap justify-between gap-2">
                  <span className="text-gold font-mono">{c.code}</span>
                  <span>
                    {c.discount_type === "percent" ? `${c.discount_value}%` : formatPrice(Number(c.discount_value))} · uses{" "}
                    {c.redemption_count}
                    {c.max_redemptions != null ? ` / ${c.max_redemptions}` : ""}
                  </span>
                  <span className="text-white/50">{c.active ? "active" : "inactive"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
