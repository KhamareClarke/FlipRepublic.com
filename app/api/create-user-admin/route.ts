import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const { email, password, username, applicationId } = payload;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  // First, verify they have an approved seller application
  const { data: allApps } = await supabase
    .from("seller_applications")
    .select("id, status, identity_info")
    .limit(100);

  const emailLower = email.toLowerCase().trim();
  
  const matchingApp = allApps?.find((app: any) => {
    const appEmail = app.identity_info?.email?.toLowerCase()?.trim();
    return appEmail === emailLower;
  });

  if (!matchingApp || matchingApp.status !== "approved") {
    return NextResponse.json({ 
      error: "No approved seller application found for this email.",
      code: "NO_APPROVED_APPLICATION"
    }, { status: 403 });
  }

  // Check if user already exists
  try {
    const { data: users } = await supabase.auth.admin.listUsers();
    const existingUser = users?.users?.find(
      (u) => u.email?.toLowerCase().trim() === emailLower
    );

    if (existingUser) {
      return NextResponse.json({ 
        error: "User already exists. Please sign in instead.",
        code: "USER_EXISTS",
        userId: existingUser.id
      }, { status: 409 });
    }
  } catch (err) {
    console.error("Error checking existing users:", err);
  }

  // Create user via admin API (bypasses rate limits)
  try {
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        username: username || email.split("@")[0],
      },
    });

    if (createError || !newUser?.user) {
      console.error("Error creating user via admin API:", createError);
      return NextResponse.json({ 
        error: createError?.message || "Failed to create user account.",
        code: "CREATE_USER_FAILED"
      }, { status: 500 });
    }

    // Wait a moment for user to be committed
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Link the seller application to the user
    if (matchingApp.id) {
      await supabase
        .from("seller_applications")
        .update({ user_id: newUser.user.id })
        .eq("id", matchingApp.id);
    }

    return NextResponse.json({
      success: true,
      userId: newUser.user.id,
      email: newUser.user.email,
      message: "User created successfully via admin API."
    });
  } catch (err: any) {
    console.error("Exception creating user:", err);
    return NextResponse.json({ 
      error: err.message || "Unknown error creating user.",
      code: "UNKNOWN_ERROR"
    }, { status: 500 });
  }
}
