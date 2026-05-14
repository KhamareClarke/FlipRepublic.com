import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const resultCount = Number(body.resultCount ?? 0);
  const referrer = request.headers.get("referer") ?? request.headers.get("referrer") ?? null;

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("search_events").insert({
    query: typeof body.query === "string" ? body.query.slice(0, 500) : null,
    category_slug: typeof body.categorySlug === "string" ? body.categorySlug.slice(0, 120) : null,
    condition_filter: typeof body.condition === "string" ? body.condition.slice(0, 80) : null,
    brand_filter: typeof body.brand === "string" ? body.brand.slice(0, 120) : null,
    size_filter: typeof body.size === "string" ? body.size.slice(0, 80) : null,
    min_price: body.minPrice != null ? Number(body.minPrice) : null,
    max_price: body.maxPrice != null ? Number(body.maxPrice) : null,
    sort: typeof body.sort === "string" ? body.sort.slice(0, 40) : null,
    result_count: Number.isFinite(resultCount) ? resultCount : 0,
    referrer: referrer?.slice(0, 2000) ?? null,
    utm_source: typeof body.utm_source === "string" ? body.utm_source.slice(0, 200) : null,
    utm_medium: typeof body.utm_medium === "string" ? body.utm_medium.slice(0, 200) : null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
