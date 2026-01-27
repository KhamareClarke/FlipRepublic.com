import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const { email } = payload;

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  try {
    // Check if user exists in auth.users
    const { data: users } = await supabase.auth.admin.listUsers();
    const existingUser = users?.users?.find(
      (u) => u.email?.toLowerCase().trim() === email.toLowerCase().trim()
    );

    if (!existingUser) {
      return NextResponse.json({ 
        exists: false,
        message: "User does not exist in authentication system. The account may need to be created."
      });
    }

    // Check if they're a seller
    const { data: seller } = await supabase
      .from("sellers")
      .select("user_id, username, is_admin_approved")
      .eq("user_id", existingUser.id)
      .maybeSingle();

    return NextResponse.json({
      exists: true,
      userId: existingUser.id,
      email: existingUser.email,
      emailConfirmed: !!existingUser.email_confirmed_at,
      isSeller: !!seller,
      sellerApproved: seller?.is_admin_approved || false,
      message: seller ? "User exists and is registered as a seller." : "User exists in authentication system."
    });
  } catch (error) {
    console.error("Error checking user auth:", error);
    return NextResponse.json({ 
      error: "Failed to check user status.",
      exists: false
    }, { status: 500 });
  }
}
