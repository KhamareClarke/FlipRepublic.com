import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserFromRequest } from "@/lib/supabase/auth";

export const runtime = "nodejs";

/** Seller: open Empire OS suggestions assigned to them. */
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdminClient();
  const { data: seller } = await supabase.from("sellers").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!seller) {
    return NextResponse.json({ error: "Seller only." }, { status: 403 });
  }

  const limit = Math.min(50, Math.max(1, Number(new URL(request.url).searchParams.get("limit") ?? "20")));

  const { data, error } = await supabase
    .from("empire_os_suggestions")
    .select("*")
    .eq("seller_id", user.id)
    .eq("dismissed", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ suggestions: data ?? [] });
}
