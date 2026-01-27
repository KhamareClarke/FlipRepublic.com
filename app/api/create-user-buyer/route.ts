import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const { email, password, username } = payload;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  // Check if user already exists
  try {
    const { data: users } = await supabase.auth.admin.listUsers();
    const emailLower = email.toLowerCase().trim();
    const existingUser = users?.users?.find(
      (u) => u.email?.toLowerCase().trim() === emailLower
    );

    if (existingUser) {
      // Check if they're a seller
      const { data: seller } = await supabase
        .from("sellers")
        .select("user_id")
        .eq("user_id", existingUser.id)
        .maybeSingle();
      
      if (seller) {
        return NextResponse.json({ 
          error: "This email is already registered as a seller. Please use a different email for buyer registration.",
          code: "ALREADY_SELLER"
        }, { status: 409 });
      }
      
      return NextResponse.json({ 
        error: "User already exists. Please sign in instead.",
        code: "USER_EXISTS",
        userId: existingUser.id
      }, { status: 409 });
    }
  } catch (err) {
    console.error("Error checking existing users:", err);
  }

  // Create user via admin API (bypasses rate limits and auto-confirms email)
  try {
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for buyers
      user_metadata: {
        username: username || email.split("@")[0],
      },
    });

    if (createError || !newUser?.user) {
      console.error("Error creating buyer user via admin API:", createError);
      return NextResponse.json({ 
        error: createError?.message || "Failed to create user account.",
        code: "CREATE_USER_FAILED"
      }, { status: 500 });
    }

    // Wait a moment for user to be committed
    await new Promise(resolve => setTimeout(resolve, 2000));

    return NextResponse.json({
      success: true,
      userId: newUser.user.id,
      email: newUser.user.email,
      message: "Buyer account created successfully."
    });
  } catch (err: any) {
    console.error("Exception creating buyer user:", err);
    return NextResponse.json({ 
      error: err.message || "Unknown error creating user.",
      code: "UNKNOWN_ERROR"
    }, { status: 500 });
  }
}
