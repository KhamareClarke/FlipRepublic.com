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
  const { data: sellers, error } = await supabase
    .from("sellers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const usersWithAuth = await Promise.all(
    (sellers ?? []).map(async (seller) => {
      const { data: authUser } = await supabase.auth.admin.getUserById(seller.user_id);
      const isVerified = authUser?.user?.email_confirmed_at != null;
      return {
        ...seller,
        is_verified: isVerified, // Set is_verified based on email confirmation
        user: authUser?.user
          ? {
              email: authUser.user.email,
              created_at: authUser.user.created_at,
              email_confirmed_at: authUser.user.email_confirmed_at,
            }
          : null,
      };
    })
  );

  return NextResponse.json({ users: usersWithAuth });
}
