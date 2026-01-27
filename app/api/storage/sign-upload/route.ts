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
  const { productId, filename } = payload;

  if (!productId || !filename) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const filePath = `products/${user.id}/${productId}/${filename}`;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(filePath);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ path: filePath, ...data });
}
