import { NextRequest, NextResponse } from "next/server";
import { getProfileForUser, getUserFromRequest } from "@/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { logAdminAction } from "@/lib/admin-audit";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfileForUser(user.id);

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json();
  const { is_admin_approved, is_banned, role } = payload;

  const supabase = createSupabaseAdminClient();

  const { data: userSeller, error: fetchError } = await supabase
    .from("sellers")
    .select("user_id")
    .eq("user_id", context.params.id)
    .single();

  if (fetchError || !userSeller) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const updateData: any = {};
  
  // Allow role update (for setting admin role)
  if (role && (role === "admin" || role === "seller")) {
    updateData.role = role;
    // Auto-approve when setting admin role
    if (role === "admin") {
      updateData.is_admin_approved = true;
    }
  }
  
  if (typeof is_admin_approved === "boolean") {
    updateData.is_admin_approved = is_admin_approved;
  }
  if (typeof is_banned === "boolean") {
    updateData.is_banned = is_banned;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const { data: updatedSeller, error: updateError } = await supabase
    .from("sellers")
    .update(updateData)
    .eq("user_id", context.params.id)
    .select("*")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await logAdminAction(user.id, "admin_user_patch", "sellers", context.params.id, {
    is_banned: updateData.is_banned,
    is_admin_approved: updateData.is_admin_approved,
    role: updateData.role,
  });

  const { data: authUser } = await supabase.auth.admin.getUserById(context.params.id);

  if (authUser?.user?.email) {
    if (is_admin_approved === true) {
      try {
        await sendEmail({
          to: authUser.user.email,
          subject: "Your FlipRepublic account has been approved! 🎉",
          text: `Congratulations!

Your account has been approved by the admin. You can now login and access your dashboard.

Login at: ${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/login

Welcome to FlipRepublic!`,
        });
      } catch (emailError) {
        console.warn("Failed to send approval email.", emailError);
      }
    } else if (is_banned === true) {
      try {
        await sendEmail({
          to: authUser.user.email,
          subject: "Your FlipRepublic account has been banned",
          text: `Your account has been banned by the admin. If you believe this is an error, please contact support.`,
        });
      } catch (emailError) {
        console.warn("Failed to send ban email.", emailError);
      }
    }
  }

  return NextResponse.json({ user: updatedSeller });
}
