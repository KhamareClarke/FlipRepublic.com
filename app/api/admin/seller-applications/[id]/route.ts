import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileForUser, getUserFromRequest } from "@/lib/supabase/auth";
import { sendEmail } from "@/lib/email";
import { tplSellerApplicationApproved, tplSellerApplicationDecision } from "@/lib/email-templates";

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
  const { status, reviewNotes } = payload;

  if (!["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: application, error } = await supabase
    .from("seller_applications")
    .update({
      status,
      review_notes: reviewNotes ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", context.params.id)
    .select("*")
    .single();

  if (error || !application) {
    return NextResponse.json({ error: error?.message ?? "Update failed." }, { status: 500 });
  }

  if (status === "approved") {
    if (application.user_id) {
      await supabase
        .from("sellers")
        .update({ role: "seller", is_admin_approved: true })
        .eq("user_id", application.user_id);
    }
  }

  await supabase.from("admin_actions").insert({
    admin_id: user.id,
    action: `seller_application_${status}`,
    target_table: "seller_applications",
    target_id: application.id,
    metadata: { reviewNotes },
  });

  const applicantEmail = application.identity_info?.email as string | undefined;
  const applicantName = (application.identity_info?.fullName as string) ?? "Seller";

  if (applicantEmail) {
    try {
      if (status === "approved") {
        const mail = tplSellerApplicationApproved({
          applicantName,
          applicantEmail,
          hasAccount: !!application.user_id,
        });
        await sendEmail({ to: applicantEmail, ...mail });
      } else {
        const mail = tplSellerApplicationDecision({ approved: false, notes: reviewNotes });
        await sendEmail({ to: applicantEmail, ...mail });
      }
    } catch (emailError) {
      console.warn("Failed to send seller application email.", emailError);
    }
  }

  return NextResponse.json({ application });
}
