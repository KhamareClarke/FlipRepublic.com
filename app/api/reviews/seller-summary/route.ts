import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRequestClient } from "@/lib/supabase/request";
import { getProfileForUser, getUserFromRequest } from "@/lib/supabase/auth";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseRequestClient(accessToken);

  const profile = await getProfileForUser(user.id);
  if (!profile || (profile.role !== "seller" && profile.role !== "admin")) {
    return NextResponse.json({ error: "Seller only." }, { status: 403 });
  }

  const { data: products, error: pErr } = await supabase
    .from("products")
    .select("id")
    .eq("seller_id", user.id);

  if (pErr) {
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }

  const ids = (products ?? []).map((p) => p.id);
  if (ids.length === 0) {
    return NextResponse.json({ avg: null, count: 0 });
  }

  const { data: revs, error } = await supabase.from("product_reviews").select("rating").in("product_id", ids);

  if (error) {
    return NextResponse.json({ avg: null, count: 0 });
  }

  const list = revs ?? [];
  const count = list.length;
  const avg = count ? list.reduce((s, r) => s + Number(r.rating), 0) / count : null;

  return NextResponse.json({
    avg: avg !== null ? Math.round(avg * 10) / 10 : null,
    count,
  });
}
