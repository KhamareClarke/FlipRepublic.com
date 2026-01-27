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

  // Check if user exists in auth.users
  try {
    const { data: users } = await supabase.auth.admin.listUsers();
    const existingUser = users?.users?.find(
      (u) => u.email?.toLowerCase().trim() === email.toLowerCase().trim()
    );

    if (!existingUser) {
      return NextResponse.json({ 
        isBuyer: false,
        exists: false,
        message: "User does not exist."
      });
    }

    // Check if they're a seller
    const { data: seller } = await supabase
      .from("sellers")
      .select("user_id")
      .eq("user_id", existingUser.id)
      .maybeSingle();

    if (seller) {
      return NextResponse.json({ 
        isBuyer: false,
        exists: true,
        isSeller: true,
        message: "This email is registered as a seller."
      });
    }

    // User exists but is not a seller = buyer
    return NextResponse.json({ 
      isBuyer: true,
      exists: true,
      isSeller: false,
      userId: existingUser.id,
      message: "This email is registered as a buyer."
    });
  } catch (error) {
    console.error("Error checking buyer:", error);
    return NextResponse.json({ 
      error: "Failed to check buyer status.",
      isBuyer: false
    }, { status: 500 });
  }
}
