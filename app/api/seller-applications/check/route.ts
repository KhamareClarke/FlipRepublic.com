import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId") || user.id;

  // Only allow users to check their own applications
  if (userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("seller_applications")
    .select("id, status")
    .eq("user_id", userId)
    .eq("status", "approved")
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ 
    hasApprovedApplication: !!data 
  });
}
