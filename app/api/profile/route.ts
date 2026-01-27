import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRequestClient } from "@/lib/supabase/request";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserFromRequest } from "@/lib/supabase/auth";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = request.headers.get("authorization")?.replace("Bearer ", "");
  const supabase = createSupabaseRequestClient(accessToken);
  
  // Check sellers table (migrated from profiles)
  const { data: sellerData, error: sellerError } = await supabase
    .from("sellers")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (sellerError) {
    return NextResponse.json({ error: sellerError.message }, { status: 500 });
  }

  // If seller exists, return it with role from sellers table
  if (sellerData) {
    // Get email from auth.users
    const supabaseAdmin = createSupabaseAdminClient();
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id);
    
    const profile = {
      ...sellerData,
      email: authUser?.user?.email || user.email,
      role: sellerData.role || "seller", // Use role from sellers table
      is_verified: sellerData.is_admin_approved, // Verified if admin approved
    };
    return NextResponse.json({ profile });
  }

  // If no seller record found, check if user is a buyer
  const { data: buyerData, error: buyerError } = await supabase
    .from("buyers")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id);
  
  if (buyerData) {
    // User is a buyer
    const profile = {
      ...buyerData,
      email: authUser?.user?.email || buyerData.email || user.email,
      role: "buyer",
      is_verified: false,
    };
    return NextResponse.json({ profile });
  }
  
  // No buyer or seller record - return basic profile
  const profile = {
    user_id: user.id,
    email: authUser?.user?.email || user.email,
    role: "buyer", // Default to buyer
    is_verified: false,
    username: authUser?.user?.user_metadata?.username || user.email?.split("@")[0] || "User",
  };
  
  return NextResponse.json({ profile });
}
