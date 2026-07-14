import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { emitFleetIngest } from "@/lib/fleet-ingest";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const { identityInfo, storeInfo, bankingInfo } = payload ?? {};

  if (!identityInfo?.email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const applicantEmail = identityInfo.email.toLowerCase().trim();

  const { data: allApps } = await supabase
    .from("seller_applications")
    .select("id, status, identity_info")
    .limit(500);

  const duplicatePending = allApps?.find(
    (app) =>
      app.status === "pending" &&
      app.identity_info?.email?.toLowerCase().trim() === applicantEmail
  );

  if (duplicatePending) {
    return NextResponse.json(
      { error: "An application with this email is already pending review." },
      { status: 400 }
    );
  }

  const alreadyApproved = allApps?.find(
    (app) =>
      app.status === "approved" &&
      app.identity_info?.email?.toLowerCase().trim() === applicantEmail
  );

  if (alreadyApproved) {
    return NextResponse.json(
      { error: "An application with this email has already been approved." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("seller_applications")
    .insert({
      user_id: null,
      identity_info: { ...identityInfo, email: applicantEmail },
      store_info: storeInfo ?? null,
      banking_info: bankingInfo ?? null,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await emitFleetIngest({
    event_type: 'lead',
    summary: `Seller application: ${identityInfo?.fullName || applicantEmail}`,
    payload: { application_id: data?.id, email: applicantEmail },
  });

  const adminEmail = process.env.ADMIN_EMAIL ?? process.env.SMTP_USER ?? "";
  const originalEmail = identityInfo?.email ?? "unknown";
  if (adminEmail) {
    const applicantName = identityInfo?.fullName ?? "New applicant";
    const message = `New seller application received.\n\nName: ${applicantName}\nEmail: ${originalEmail}\nStatus: pending`;
    try {
      await sendEmail({
        to: adminEmail,
        subject: "New seller application submitted",
        text: message,
      });
    } catch (emailError) {
      console.warn("Failed to send admin notification email.", emailError);
    }
  }

  if (originalEmail && originalEmail !== "unknown") {
    try {
      await sendEmail({
        to: originalEmail,
        subject: "FlipRepublic application received",
        text:
          "Your application is received. A confirmation email has been sent to you. " +
          "The admin team will notify you by email once approved.",
      });
    } catch (emailError) {
      console.warn("Failed to send applicant confirmation email.", emailError);
    }
  }

  return NextResponse.json({ application: data });
}
