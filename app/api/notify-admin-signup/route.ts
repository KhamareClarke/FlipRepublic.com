import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { tplBuyerSignupNotifyAdmin } from "@/lib/email-templates";

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
      ...tplBuyerSignupNotifyAdmin({
        buyerEmail: email,
        username: displayUsername,
        userId,
        role: userRole,
      }),
    });

    return NextResponse.json({ success: true, message: "Admin notification sent." });
  } catch (emailError) {
    console.error("Failed to send admin notification email:", emailError);
    // Don't fail the signup if email fails
    return NextResponse.json({ success: true, message: "Signup successful, but admin notification failed." });
  }
}
