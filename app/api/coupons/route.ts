import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserFromRequest } from "@/lib/supabase/auth";

export const runtime = "nodejs";

function normalizeCode(code: string) {
  return code.trim().toLowerCase();
}

async function getSellerGate(userId: string) {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("sellers")
    .select("role, is_admin_approved")
    .eq("user_id", userId)
    .maybeSingle();
  return data as { role: string; is_admin_approved: boolean } | null;
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const me = await getSellerGate(user.id);
  if (!me || (me.role !== "admin" && !me.is_admin_approved)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createSupabaseAdminClient();
  let q = supabase.from("coupons").select("*").order("created_at", { ascending: false });

  if (me.role !== "admin") {
    q = q.eq("seller_id", user.id);
  }

  const { data, error } = await q.limit(100);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ coupons: data ?? [] });
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const me = await getSellerGate(user.id);
  if (!me || (me.role !== "admin" && !me.is_admin_approved)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const {
    code,
    discount_type,
    discount_value,
    seller_id: bodySellerId,
    product_id,
    min_order_amount,
    max_redemptions,
    starts_at,
    ends_at,
    active = true,
  } = body;

  const norm = typeof code === "string" ? normalizeCode(code) : "";
  if (!norm || norm.length < 3 || norm.length > 40) {
    return NextResponse.json({ error: "Code must be 3–40 characters." }, { status: 400 });
  }

  if (discount_type !== "percent" && discount_type !== "fixed") {
    return NextResponse.json({ error: "discount_type must be percent or fixed." }, { status: 400 });
  }

  const dv = Number(discount_value);
  if (!Number.isFinite(dv) || dv <= 0) {
    return NextResponse.json({ error: "Invalid discount_value." }, { status: 400 });
  }

  if (discount_type === "percent" && dv > 100) {
    return NextResponse.json({ error: "Percent discount cannot exceed 100." }, { status: 400 });
  }

  let sellerId: string | null = null;
  if (me.role === "admin") {
    sellerId = bodySellerId === null || bodySellerId === "" ? null : String(bodySellerId);
  } else {
    sellerId = user.id;
  }

  const supabase = createSupabaseAdminClient();

  if (product_id) {
    const { data: prod } = await supabase.from("products").select("id, seller_id").eq("id", product_id).maybeSingle();
    if (!prod) {
      return NextResponse.json({ error: "product_id not found." }, { status: 400 });
    }
    if (sellerId != null && prod.seller_id !== sellerId) {
      return NextResponse.json({ error: "Product does not belong to this seller." }, { status: 400 });
    }
  }

  const insert = {
    code: norm,
    discount_type,
    discount_value: dv,
    seller_id: sellerId,
    product_id: product_id || null,
    min_order_amount: min_order_amount != null ? Number(min_order_amount) : 0,
    max_redemptions: max_redemptions != null ? Math.floor(Number(max_redemptions)) : null,
    starts_at: starts_at || null,
    ends_at: ends_at || null,
    active: Boolean(active),
  };

  const { data: row, error } = await supabase.from("coupons").insert(insert).select("*").single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ coupon: row });
}
