import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileForUser, getUserFromRequest } from "@/lib/supabase/auth";
import { sendEmail } from "@/lib/email";

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
      // Update seller record if it exists
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

  const applicantEmail = application.identity_info?.email;
  const applicantName = application.identity_info?.fullName ?? "Seller";
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  if (applicantEmail) {
    if (status === "approved") {
      const hasAccount = !!application.user_id;
      const subject = "Your FlipRepublic seller account is approved! 🎉";
      const message = hasAccount
        ? `Congratulations ${applicantName}!

Your seller account has been approved. You can now list products on FlipRepublic.

Login to your seller dashboard:
${baseUrl}/login

Email: ${applicantEmail}

After logging in, you can:
- Access your seller dashboard at ${baseUrl}/dashboard
- List your products
- Manage your inventory
- Track your sales

Welcome to FlipRepublic!`
        : `Congratulations ${applicantName}!

Your seller application has been approved! 🎉

To get started, you need to create an account using the email address from your application:
Email: ${applicantEmail}

Steps to get started:
1. Go to ${baseUrl}/signup
2. Sign up with your approved email: ${applicantEmail}
3. After signing up, your account will automatically be set up as a seller
4. Access your seller dashboard at ${baseUrl}/dashboard

Once you're logged in, you can:
- List your products
- Manage your inventory
- Track your sales

Welcome to FlipRepublic!`;

      try {
        await sendEmail({ to: applicantEmail, subject, text: message });
      } catch (emailError) {
        console.warn("Failed to send approval email.", emailError);
      }
    } else {
      const subject = "Your FlipRepublic seller application update";
      const message = `Hello ${applicantName},

Your seller application was not approved at this time. 

${reviewNotes ? `Review notes: ${reviewNotes}\n\n` : ""}Please contact support if you have any questions.

Thank you for your interest in FlipRepublic.`;

      try {
        await sendEmail({ to: applicantEmail, subject, text: message });
      } catch (emailError) {
        console.warn("Failed to send rejection email.", emailError);
      }
    }
  }

  return NextResponse.json({ application });
}
