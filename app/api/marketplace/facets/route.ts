import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { MARKETPLACE_STOCK_OR } from "@/lib/product-inventory";

export const runtime = "nodejs";

type FilterHints = {
  preferredSizes?: string[];
  preferredBrands?: string[];
};

function countMap(items: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const x of items) {
    if (!x) continue;
    m.set(x, (m.get(x) ?? 0) + 1);
  }
  return m;
}

function sortSmart(values: string[], hints: string[] | undefined, byCount: Map<string, number>): string[] {
  const hintSet = new Set((hints ?? []).filter(Boolean));
  const unique = Array.from(new Set(values));
  return unique.sort((a, b) => {
    const ah = hintSet.has(a) ? 0 : 1;
    const bh = hintSet.has(b) ? 0 : 1;
    if (ah !== bh) return ah - bh;
    return (byCount.get(b) ?? 0) - (byCount.get(a) ?? 0);
  });
}

/** Facets for active listings: popularity-ordered brands/sizes + category filter_hints. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categorySlug = searchParams.get("category");
  const condition = searchParams.get("condition");

  const supabase = createSupabaseAdminClient();
  let categoryId: string | null = null;
  let hints: FilterHints = {};
  if (categorySlug && categorySlug !== "all") {
    const { data, error } = await supabase
      .from("categories")
      .select("id, filter_hints")
      .eq("slug", categorySlug)
      .maybeSingle();
    if (error?.message?.toLowerCase().includes("filter_hints")) {
      const { data: d2 } = await supabase.from("categories").select("id").eq("slug", categorySlug).maybeSingle();
      categoryId = d2?.id ?? null;
    } else {
      categoryId = data?.id ?? null;
      hints = (data?.filter_hints as FilterHints) ?? {};
    }
  }

  let q = supabase
    .from("products")
    .select("brand, size, price")
    .eq("status", "active")
    .or(MARKETPLACE_STOCK_OR);
  if (categoryId) q = q.eq("category_id", categoryId);
  if (condition && condition !== "all") q = q.eq("condition", condition);

  const { data, error } = await q.limit(5000);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const brandsRaw = rows.map((r: { brand: string }) => r.brand).filter(Boolean);
  const sizesRaw = rows.map((r: { size: string }) => r.size).filter(Boolean);
  const brandCounts = countMap(brandsRaw);
  const sizeCounts = countMap(sizesRaw);
  const brands = sortSmart(brandsRaw, hints.preferredBrands, brandCounts);
  const sizes = sortSmart(sizesRaw, hints.preferredSizes, sizeCounts);
  const brandScores = brands.map((b) => ({ brand: b, count: brandCounts.get(b) ?? 0 }));
  const sizeScores = sizes.map((s) => ({ size: s, count: sizeCounts.get(s) ?? 0 }));
  const prices = rows.map((r: { price: number }) => Number(r.price)).filter((n) => Number.isFinite(n));
  const priceMin = prices.length ? Math.min(...prices) : 0;
  const priceMax = prices.length ? Math.max(...prices) : 0;

  return NextResponse.json({
    brands,
    sizes,
    brandsOrdered: brands,
    sizesOrdered: sizes,
    brandScores,
    sizeScores,
    priceRange: { min: priceMin, max: priceMax },
    filterHints: hints,
  });
}
