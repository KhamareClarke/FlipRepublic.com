import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRequestClient } from "@/lib/supabase/request";
import { getProfileForUser, getUserFromRequest } from "@/lib/supabase/auth";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfileForUser(user.id);
  if (!profile || profile.role !== "seller") {
    return NextResponse.json({ error: "Seller access required." }, { status: 403 });
  }

  const accessToken = request.headers.get("authorization")?.replace("Bearer ", "");
  const supabase = createSupabaseRequestClient(accessToken);
  const { data, error } = await supabase
    .from("payouts")
    .select("*")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ payouts: data ?? [] });
}
