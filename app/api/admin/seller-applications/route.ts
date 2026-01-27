import { NextRequest, NextResponse } from "next/server";
import { getProfileForUser, getUserFromRequest } from "@/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfileForUser(user.id);

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("seller_applications")
    .select(`
      *,
      seller:sellers!seller_applications_user_id_fkey(user_id, username, role, is_admin_approved)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ applications: data ?? [] });
}
