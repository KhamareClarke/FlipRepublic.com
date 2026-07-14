import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRequestClient } from "@/lib/supabase/request";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileForUser, getUserFromRequest } from "@/lib/supabase/auth";
import { sendEmail } from "@/lib/email";
import { tplAdminNewListing } from "@/lib/email-templates";
import { normalizeProductSeller } from "@/lib/product-serialize";
import { findBannedListingTerms } from "@/lib/content-filter";
import { MARKETPLACE_STOCK_OR } from "@/lib/product-inventory";
import { emitFleetIngest } from "@/lib/fleet-ingest";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const condition = searchParams.get("condition");
  const brand = searchParams.get("brand");
  const search = searchParams.get("search");
  const size = searchParams.get("size");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const sort = searchParams.get("sort") ?? "newest";
  const mine = searchParams.get("mine") === "true";
  const status = searchParams.get("status");

  let accessToken = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!accessToken) {
    accessToken = undefined;
  }

  let viewerUser: { id: string } | null = null;
  if (mine) {
    const u = await getUserFromRequest(request);
    if (!u) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    viewerUser = u;
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

  const selectCols = `
        *,
        images:product_images(*),
        seller:sellers(user_id, username, role, is_admin_approved),
        category:categories(*)
      `;

  const qTrim = (search ?? "").trim().slice(0, 200);
  const preferFts = qTrim.length > 0 && process.env.USE_PRODUCT_FTS !== "false";
  const searchModes: ("fts" | "ilike")[] = preferFts ? ["fts", "ilike"] : ["ilike"];

  let data: any[] | null = null;
  let error: { message: string } | null = null;

  for (const mode of searchModes) {
    let query = supabase.from("products").select(selectCols);

    if (mine) {
      if (status) query = query.eq("status", status);
    } else if (status) {
      query = query.eq("status", status);
    }

    if (!mine && status === "active") {
      query = query.or(MARKETPLACE_STOCK_OR);
    }

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    if (condition && condition !== "all") {
      query = query.eq("condition", condition);
    }

    if (brand && brand !== "all") {
      query = query.eq("brand", brand);
    }

    if (size && size !== "all") {
      query = query.eq("size", size);
    }

    const minP = minPrice != null ? Number(minPrice) : NaN;
    if (Number.isFinite(minP)) {
      query = query.gte("price", minP);
    }
    const maxP = maxPrice != null ? Number(maxPrice) : NaN;
    if (Number.isFinite(maxP)) {
      query = query.lte("price", maxP);
    }

    if (qTrim.length > 0) {
      if (mode === "fts") {
        const fts = qTrim.replace(/[^a-zA-Z0-9\s'-]/g, " ").trim();
        if (fts.length === 0) continue;
        query = query.textSearch("search_tsv", fts, { type: "websearch", config: "english" });
      } else {
        const esc = qTrim.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
        query = query.or(`name.ilike.%${esc}%,brand.ilike.%${esc}%,description.ilike.%${esc}%`);
      }
    }

    if (mine && viewerUser) {
      query = query.eq("seller_id", viewerUser.id);
    }

    switch (sort) {
      case "price_asc":
        query = query.order("price", { ascending: true });
        break;
      case "price_desc":
        query = query.order("price", { ascending: false });
        break;
      default:
        query = query.order("created_at", { ascending: false });
    }

    const res = await query;
    if (!res.error) {
      data = res.data;
      error = null;
      break;
    }
    error = res.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []).map((row) => normalizeProductSeller(row));
  const ids = rows.map((p) => p.id).filter(Boolean);
  const statsByProduct = new Map<string, { review_avg: number; review_count: number }>();

  if (ids.length > 0) {
    const pub = createSupabaseRequestClient();
    const { data: revRows } = await pub.from("product_reviews").select("product_id, rating").in("product_id", ids);
    if (revRows && revRows.length > 0) {
      const acc = new Map<string, number[]>();
      for (const r of revRows) {
        const pid = r.product_id as string;
        if (!pid) continue;
        if (!acc.has(pid)) acc.set(pid, []);
        acc.get(pid)!.push(Number(r.rating));
      }
      for (const [pid, ratings] of Array.from(acc.entries())) {
        const n = ratings.length;
        statsByProduct.set(pid, {
          review_avg: Math.round((ratings.reduce((a, b) => a + b, 0) / n) * 10) / 10,
          review_count: n,
        });
      }
    }
  }

  const merged = rows.map((p) => {
    const s = statsByProduct.get(p.id);
    return s ? { ...p, ...s } : { ...p, review_avg: null as number | null, review_count: 0 };
  });

  return NextResponse.json({ products: merged });
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
    sku = null as string | null,
    stock_quantity = 1,
    track_inventory = true,
  } = payload;

  if (!name || !brand || !condition || !size || !price) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const combinedText = [name, brand, description ?? "", colorway ?? ""].join(" ");
  const banned = findBannedListingTerms(combinedText);
  if (banned.length > 0) {
    return NextResponse.json(
      { error: "Listing contains blocked terms. Revise your title or description.", terms: banned },
      { status: 400 }
    );
  }

  const minImages = Math.max(1, Math.min(12, Number(process.env.MIN_PRODUCT_IMAGES ?? "4")));
  if (!Array.isArray(images) || images.length < minImages) {
    return NextResponse.json(
      {
        error: `At least ${minImages} product images are required (multiple angles help verification).`,
      },
      { status: 400 }
    );
  }

  const skuTrim = typeof sku === "string" && sku.trim() ? sku.trim() : null;
  const stockNum = Math.max(0, Math.floor(Number(stock_quantity ?? 1)));
  const trackInv = track_inventory !== false;

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
      sku: skuTrim,
      stock_quantity: stockNum,
      track_inventory: trackInv,
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

  const { empireDispatch } = await import("@/lib/empire-os/dispatch");
  void empireDispatch({
    event_type: "listing.submitted",
    payload: { name, status: product.status, sku: skuTrim, price: Number(price) },
    actor_user_id: user.id,
    product_id: product.id,
  }).catch((e) => console.error("[empire_os]", e));

  // Await so Vercel does not drop the JARVIS notify when the response returns.
  await emitFleetIngest({
    event_type: "listing",
    summary: `New listing: ${name} (£${Number(price).toFixed(2)}) — under review`,
    payload: {
      product_id: product.id,
      name,
      sku: skuTrim,
      price: Number(price),
      status: product.status,
      seller_user_id: user.id,
    },
  });

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
      
      const { getSiteBaseUrl } = await import("@/lib/site-url");
      const baseUrl = getSiteBaseUrl();
      const mail = tplAdminNewListing({
        productName: name,
        sellerUsername: sellerName,
        productUrl: `${baseUrl}/admin`,
      });
      await sendEmail({
        to: adminEmail,
        ...mail,
      });
    }
  } catch (emailError) {
    console.error("Failed to send admin notification:", emailError);
    // Don't fail the product creation if email fails
  }

  return NextResponse.json({ product });
}
