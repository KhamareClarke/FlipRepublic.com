import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserFromRequest } from "@/lib/supabase/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const productId = body.productId as string | undefined;
  if (!productId) {
    return NextResponse.json({ error: "productId required." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: product, error: pErr } = await supabase
    .from("products")
    .select("id, seller_id")
    .eq("id", productId)
    .maybeSingle();

  if (pErr || !product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const user = await getUserFromRequest(request);
  const referrer = request.headers.get("referer") ?? request.headers.get("referrer") ?? null;

  const { error } = await supabase.from("product_view_events").insert({
    product_id: product.id,
    seller_id: product.seller_id,
    viewer_id: user?.id ?? null,
    referrer: referrer?.slice(0, 2000) ?? null,
    utm_source: typeof body.utm_source === "string" ? body.utm_source.slice(0, 200) : null,
    utm_medium: typeof body.utm_medium === "string" ? body.utm_medium.slice(0, 200) : null,
    country_code: typeof body.country_code === "string" ? body.country_code.slice(0, 8) : null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { empireDispatch } = await import("@/lib/empire-os/dispatch");
  void empireDispatch({
    event_type: "product.view",
    payload: { referrer: referrer?.slice(0, 500) ?? null },
    actor_user_id: user?.id ?? null,
    product_id: product.id,
  }).catch((e) => console.error("[empire_os]", e));

  return NextResponse.json({ ok: true });
}
