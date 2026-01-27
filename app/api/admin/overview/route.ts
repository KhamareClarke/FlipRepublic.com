import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileForUser, getUserFromRequest } from "@/lib/supabase/auth";

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
  const [usersCount, orders, pendingApps, underReview] = await Promise.all([
    supabase.from("sellers").select("user_id", { count: "exact", head: true }),
    supabase.from("orders").select("amount"),
    supabase.from("seller_applications").select("id").eq("status", "pending"),
    supabase.from("products").select("id").eq("status", "under_review"),
  ]);

  const totalRevenue = (orders.data ?? []).reduce(
    (sum, order) => sum + Number(order.amount ?? 0),
    0
  );

  return NextResponse.json({
    metrics: {
      totalUsers: usersCount.count ?? 0,
      totalRevenue,
      pendingApplications: pendingApps.data?.length ?? 0,
      underReviewListings: underReview.data?.length ?? 0,
    },
  });
}
