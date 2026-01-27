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

  // Get all seller applications for this email
  const { data: allApps } = await supabase
    .from("seller_applications")
    .select("id, status, identity_info")
    .limit(100);

  const emailLower = email.toLowerCase().trim();
  
  const matchingApp = allApps?.find((app: any) => {
    const appEmail = app.identity_info?.email?.toLowerCase()?.trim();
    return appEmail === emailLower;
  });

  if (!matchingApp) {
    return NextResponse.json({ 
      hasApplication: false,
      status: null,
      message: "No seller application found. Please apply first."
    });
  }

  if (matchingApp.status === "approved") {
    return NextResponse.json({ 
      hasApplication: true,
      status: "approved",
      applicationId: matchingApp.id,
      message: "You have an approved seller application. You can sign up and login."
    });
  }

  if (matchingApp.status === "pending") {
    return NextResponse.json({ 
      hasApplication: true,
      status: "pending",
      message: "Your seller application is pending approval. Please wait for admin approval before signing up."
    });
  }

  if (matchingApp.status === "rejected") {
    return NextResponse.json({ 
      hasApplication: true,
      status: "rejected",
      message: "Your seller application was rejected. Please contact support or apply again."
    });
  }

  return NextResponse.json({ 
    hasApplication: true,
    status: matchingApp.status,
    message: "Please check your application status."
  });
}
