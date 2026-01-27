import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const { email, userId, username } = payload;

  if (!email || !userId) {
    return NextResponse.json({ error: "Email and userId are required." }, { status: 400 });
  }

  const adminEmail = process.env.ADMIN_EMAIL ?? process.env.SMTP_USER ?? "";
  
  if (!adminEmail) {
    // No admin email configured, skip notification
    return NextResponse.json({ success: true, message: "No admin email configured." });
  }

  try {
    // Get user profile to check role
    const supabase = createSupabaseAdminClient();
    
    // Check if user is a seller
    const { data: seller } = await supabase
      .from("sellers")
      .select("role, username")
      .eq("user_id", userId)
      .maybeSingle();
    
    // Check if user is a buyer
    const { data: buyer } = await supabase
      .from("buyers")
      .select("username")
      .eq("user_id", userId)
      .maybeSingle();

    let userRole = "buyer"; // Default to buyer
    let displayUsername = username ?? email.split("@")[0];
    
    if (seller) {
      userRole = seller.role || "seller";
      displayUsername = seller.username ?? displayUsername;
    } else if (buyer) {
      userRole = "buyer";
      displayUsername = buyer.username ?? displayUsername;
    }

    await sendEmail({
      to: adminEmail,
      subject: "New User Registration - FlipRepublic",
      text: `A new user has registered on FlipRepublic.

Email: ${email}
Username: ${displayUsername}
Role: ${userRole}
User ID: ${userId}

Please review and approve this user in the admin dashboard:
${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/admin

${userRole === "buyer" ? "Buyer accounts are automatically approved and can login immediately." : "The user cannot login until their profile is approved by an admin."}`,
    });

    return NextResponse.json({ success: true, message: "Admin notification sent." });
  } catch (emailError) {
    console.error("Failed to send admin notification email:", emailError);
    // Don't fail the signup if email fails
    return NextResponse.json({ success: true, message: "Signup successful, but admin notification failed." });
  }
}
