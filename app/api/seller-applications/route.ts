import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRequestClient } from "@/lib/supabase/request";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserFromRequest } from "@/lib/supabase/auth";
import { sendEmail } from "@/lib/email";
import { emitFleetIngest } from "@/lib/fleet-ingest";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = request.headers.get("authorization")?.replace("Bearer ", "");
  const supabase = createSupabaseRequestClient(accessToken);
  const { data, error } = await supabase
    .from("seller_applications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ applications: data ?? [] });
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = request.headers.get("authorization")?.replace("Bearer ", "");
  const supabase = createSupabaseRequestClient(accessToken);
  const payload = await request.json();

  const { identityInfo, storeInfo, bankingInfo } = payload;

  const applicantEmail = identityInfo?.email ?? user.email;
  if (!applicantEmail) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const emailLower = applicantEmail.toLowerCase().trim();

  const { data: userApps } = await supabaseAdmin
    .from("seller_applications")
    .select("id, status")
    .eq("user_id", user.id)
    .limit(10);

  const duplicateByUser = userApps?.find((app) => app.status === "pending");
  if (duplicateByUser) {
    return NextResponse.json(
      { error: "You already have a pending application." },
      { status: 400 }
    );
  }

  const { data: allApps } = await supabaseAdmin
    .from("seller_applications")
    .select("id, status, identity_info")
    .limit(500);

  const duplicateByEmail = allApps?.find(
    (app) =>
      app.status === "pending" &&
      app.identity_info?.email?.toLowerCase().trim() === emailLower
  );
  if (duplicateByEmail) {
    return NextResponse.json(
      { error: "An application with this email is already pending review." },
      { status: 400 }
    );
  }

  const alreadyApproved = allApps?.find(
    (app) =>
      app.status === "approved" &&
      app.identity_info?.email?.toLowerCase().trim() === emailLower
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
      user_id: user.id,
      identity_info: { ...identityInfo, email: emailLower },
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
    event_type: "lead",
    summary: `Seller application: ${identityInfo?.fullName || applicantEmail}`,
    payload: { application_id: data?.id, email: applicantEmail, user_id: user.id },
  });

  const adminEmail = process.env.ADMIN_EMAIL ?? process.env.SMTP_USER ?? "";
  const originalEmail = identityInfo?.email ?? user.email ?? "unknown";
  
  if (adminEmail) {
    const applicantName = identityInfo?.fullName ?? "New applicant";
    const message = `New seller application received.\n\nName: ${applicantName}\nEmail: ${originalEmail}\nUser ID: ${user.id}\nStatus: pending`;
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
