import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserFromRequest } from "@/lib/supabase/auth";

const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "product-images";

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const { path } = payload;

  if (!path) {
    return NextResponse.json({ error: "Path required." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ url: data?.signedUrl });
}
