import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRequestClient } from "@/lib/supabase/request";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileForUser, getUserFromRequest } from "@/lib/supabase/auth";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const condition = searchParams.get("condition");
  const brand = searchParams.get("brand");
  const search = searchParams.get("search");
  const mine = searchParams.get("mine") === "true";
  const status = searchParams.get("status");

  let accessToken = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!accessToken) {
    accessToken = undefined;
  }

  if (mine) {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createSupabaseRequestClient(accessToken);
  let categoryId: string | null = null;

  if (category && category !== "all") {
    const { data } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", category)
      .maybeSingle();
    categoryId = data?.id ?? null;
  }

  let query = supabase
    .from("products")
    .select(
      `
        *,
        images:product_images(*),
        seller:sellers(user_id, username, role, is_admin_approved),
        category:categories(*)
      `
    )
    .order("created_at", { ascending: false });
  
  // Only filter by status if explicitly requested (show all products by default)
  // Only filter for "mine" queries to show seller's own products
  if (mine && !status) {
    // For seller's own products, show all statuses
  } else if (status) {
    // If status filter is explicitly set, apply it
    query = query.eq("status", status);
  }
  // Otherwise, show all products (active, sold, draft, etc.)

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  if (condition && condition !== "all") {
    query = query.eq("condition", condition);
  }

  if (brand && brand !== "all") {
    query = query.eq("brand", brand);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,brand.ilike.%${search}%`);
  }

  if (mine) {
    const user = await getUserFromRequest(request);
    if (user) {
      query = query.eq("seller_id", user.id);
    }
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ products: data ?? [] });
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = request.headers.get("authorization")?.replace("Bearer ", "");
  const supabase = createSupabaseRequestClient(accessToken);

  // Check if user is an approved seller
  const { data: seller } = await supabase
    .from("sellers")
    .select("user_id, is_admin_approved")
    .eq("user_id", user.id)
    .single();

  if (!seller || !seller.is_admin_approved) {
    return NextResponse.json({ error: "Approved seller account required." }, { status: 403 });
  }

  const payload = await request.json();
  const {
    name,
    brand,
    condition,
    size,
    price,
    categoryId,
    description,
    colorway,
    releaseYear,
    images = [],
  } = payload;

  if (!name || !brand || !condition || !size || !price) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      seller_id: user.id,
      category_id: categoryId ?? null,
      name,
      brand,
      condition,
      size,
      price,
      description,
      colorway,
      release_year: releaseYear ?? null,
      status: "under_review",
      authenticated: false,
    })
    .select("*")
    .single();

  if (error || !product) {
    return NextResponse.json({ error: error?.message ?? "Failed to create product." }, { status: 500 });
  }

  if (Array.isArray(images) && images.length > 0) {
    await supabase.from("product_images").insert(
      images.map((url: string, index: number) => ({
        product_id: product.id,
        url,
        sort_order: index,
      }))
    );
  }

  // Send email notification to admin
  try {
    const adminEmail = process.env.ADMIN_EMAIL ?? process.env.SMTP_USER ?? "";
    if (adminEmail) {
      const supabaseAdmin = createSupabaseAdminClient();
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id);
      const sellerEmail = authUser?.user?.email || "Unknown";
      
      // Fetch seller data to get username
      const { data: sellerData } = await supabaseAdmin
        .from("sellers")
        .select("username")
        .eq("user_id", user.id)
        .maybeSingle();
      
      const sellerName = sellerData?.username || sellerEmail.split("@")[0];
      
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      await sendEmail({
        to: adminEmail,
        subject: "New Product Listing - FlipRepublic",
        text: `A new product listing has been submitted for review.

Product: ${name}
Brand: ${brand}
Price: £${price}
Condition: ${condition}
Size: ${size}

Seller: ${sellerName} (${sellerEmail})
Product ID: ${product.id}

Status: Under Review

Please review and approve this listing:
${baseUrl}/admin

The product will be visible on the marketplace once approved.`,
      });
    }
  } catch (emailError) {
    console.error("Failed to send admin notification:", emailError);
    // Don't fail the product creation if email fails
  }

  return NextResponse.json({ product });
}
