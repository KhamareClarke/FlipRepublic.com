import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRequestClient } from "@/lib/supabase/request";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserFromRequest } from "@/lib/supabase/auth";
import { findBannedListingTerms } from "@/lib/content-filter";

export const runtime = "nodejs";

const MAX_ROWS = 80;

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out.map((s) => s.replace(/^"|"$/g, ""));
}

function parseCsv(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return lines.map(parseCsvLine);
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = request.headers.get("authorization")?.replace("Bearer ", "");
  const supabaseUser = createSupabaseRequestClient(accessToken);

  const { data: seller } = await supabaseUser
    .from("sellers")
    .select("user_id, is_admin_approved")
    .eq("user_id", user.id)
    .single();

  if (!seller?.is_admin_approved) {
    return NextResponse.json({ error: "Approved seller account required." }, { status: 403 });
  }

  const body = await request.json();
  const csvText = typeof body.csv === "string" ? body.csv : "";
  if (!csvText.trim()) {
    return NextResponse.json({ error: "Provide csv string in JSON body." }, { status: 400 });
  }

  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    return NextResponse.json({ error: "CSV must include a header row and at least one data row." }, { status: 400 });
  }

  const header = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const idx = (name: string) => header.indexOf(name);

  const iName = idx("name");
  const iBrand = idx("brand");
  const iCondition = idx("condition");
  const iSize = idx("size");
  const iPrice = idx("price");
  const iCat = idx("category_slug");
  const iDesc = idx("description");
  const iSku = idx("sku");
  const iStock = idx("stock_quantity");
  const iTrack = idx("track_inventory");
  const iImages = idx("image_urls");

  if (iName < 0 || iBrand < 0 || iCondition < 0 || iSize < 0 || iPrice < 0 || iImages < 0) {
    return NextResponse.json(
      {
        error:
          "Required columns: name, brand, condition, size, price, image_urls (pipe-separated URLs, min env MIN_PRODUCT_IMAGES). Optional: category_slug, description, sku, stock_quantity, track_inventory (true/false).",
      },
      { status: 400 }
    );
  }

  const minImages = Math.max(1, Math.min(12, Number(process.env.MIN_PRODUCT_IMAGES ?? "4")));
  const supabaseAdmin = createSupabaseAdminClient();
  const dataRows = rows.slice(1).filter((r) => r.some((c) => c.length > 0));
  const slice = dataRows.slice(0, MAX_ROWS);

  const created: string[] = [];
  const errors: { row: number; message: string }[] = [];

  for (let r = 0; r < slice.length; r++) {
    const row = slice[r];
    const lineNo = r + 2;
    const name = row[iName]?.trim() ?? "";
    const brand = row[iBrand]?.trim() ?? "";
    const condition = row[iCondition]?.trim() ?? "";
    const size = row[iSize]?.trim() ?? "";
    const price = parseFloat(row[iPrice] ?? "");
    const categorySlug = iCat >= 0 ? row[iCat]?.trim() : "";
    const description = iDesc >= 0 ? row[iDesc]?.trim() : "";
    const sku = iSku >= 0 ? row[iSku]?.trim() || null : null;
    const stockQty = iStock >= 0 ? Math.max(0, Math.floor(Number(row[iStock] ?? 1))) : 1;
    const trackRaw = iTrack >= 0 ? String(row[iTrack] ?? "true").toLowerCase() : "true";
    const track_inventory = !["false", "0", "no", "n"].includes(trackRaw);

    const imagePart = row[iImages] ?? "";
    const images = imagePart
      .split("|")
      .map((u) => u.trim())
      .filter(Boolean);

    if (!name || !brand || !condition || !size || !Number.isFinite(price) || price <= 0) {
      errors.push({ row: lineNo, message: "Missing name/brand/condition/size or invalid price." });
      continue;
    }

    if (images.length < minImages) {
      errors.push({ row: lineNo, message: `Need at least ${minImages} image URLs (pipe-separated).` });
      continue;
    }

    const combined = [name, brand, description].join(" ");
    const banned = findBannedListingTerms(combined);
    if (banned.length > 0) {
      errors.push({ row: lineNo, message: "Blocked terms in listing." });
      continue;
    }

    let categoryId: string | null = null;
    if (categorySlug) {
      const { data: cat } = await supabaseAdmin.from("categories").select("id").eq("slug", categorySlug).maybeSingle();
      categoryId = cat?.id ?? null;
      if (!categoryId) {
        errors.push({ row: lineNo, message: `Unknown category_slug: ${categorySlug}` });
        continue;
      }
    }

    const insertPayload: Record<string, unknown> = {
      seller_id: user.id,
      category_id: categoryId,
      name,
      brand,
      condition,
      size,
      price,
      description: description || null,
      status: "under_review",
      authenticated: false,
      sku,
      stock_quantity: stockQty,
      track_inventory,
    };

    const { data: product, error } = await supabaseUser.from("products").insert(insertPayload).select("id").single();

    if (error || !product) {
      errors.push({ row: lineNo, message: error?.message ?? "Insert failed." });
      continue;
    }

    await supabaseUser.from("product_images").insert(
      images.map((url: string, index: number) => ({
        product_id: product.id,
        url,
        sort_order: index,
      }))
    );

    created.push(product.id);
  }

  return NextResponse.json({
    created: created.length,
    productIds: created,
    errors,
    truncated: dataRows.length > MAX_ROWS,
  });
}
