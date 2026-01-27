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

  try {
    // Use admin API to list users and find by email
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error("Error listing users:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const user = users?.users?.find(
      (u) => u.email?.toLowerCase().trim() === email.toLowerCase().trim()
    );

    return NextResponse.json({
      exists: !!user,
      userId: user?.id || null,
    });
  } catch (err: any) {
    console.error("Exception checking user:", err);
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}
