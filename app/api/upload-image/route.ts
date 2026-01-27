import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/supabase/auth";
import { createSupabaseRequestClient } from "@/lib/supabase/request";

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is an approved seller
  const accessToken = request.headers.get("authorization")?.replace("Bearer ", "");
  const supabase = createSupabaseRequestClient(accessToken);
  
  const { data: seller } = await supabase
    .from("sellers")
    .select("user_id, is_admin_approved")
    .eq("user_id", user.id)
    .single();

  if (!seller || !seller.is_admin_approved) {
    return NextResponse.json({ error: "Approved seller account required." }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File size too large. Maximum size is 10MB." }, { status: 400 });
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(fileName);

    return NextResponse.json({
      url: urlData.publicUrl,
      path: fileName,
    });
  } catch (error: any) {
    console.error("Image upload error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload image." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "Path is required." }, { status: 400 });
  }

  // Verify user owns this image (path starts with their user_id)
  if (!path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Unauthorized to delete this image." }, { status: 403 });
  }

  const accessToken = request.headers.get("authorization")?.replace("Bearer ", "");
  const supabase = createSupabaseRequestClient(accessToken);

  const { error } = await supabase.storage
    .from("product-images")
    .remove([path]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
