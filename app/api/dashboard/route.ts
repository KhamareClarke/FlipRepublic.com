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

  const [productsResponse, ordersResponse] = await Promise.all([
    supabase.from("products").select("id, status, price").eq("seller_id", user.id),
    supabase.from("orders").select("amount").eq("seller_id", user.id),
  ]);

  if (productsResponse.error || ordersResponse.error) {
    return NextResponse.json(
      { error: productsResponse.error?.message ?? ordersResponse.error?.message ?? "Failed to load." },
      { status: 500 }
    );
  }

  const products = productsResponse.data ?? [];
  const orders = ordersResponse.data ?? [];

  const activeListings = products.filter((product) => product.status === "active").length;
  const soldItems = products.filter((product) => product.status === "sold").length;
  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.amount ?? 0), 0);

  return NextResponse.json({
    stats: {
      activeListings,
      soldItems,
      totalRevenue,
    },
  });
}
