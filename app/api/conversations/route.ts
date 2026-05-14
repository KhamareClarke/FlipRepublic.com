import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRequestClient } from "@/lib/supabase/request";
import { getProfileForUser, getUserFromRequest } from "@/lib/supabase/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseRequestClient(accessToken);
  const { data: convos, error } = await supabase
    .from("conversations")
    .select(
      `
      *,
      product:products(id, name, images:product_images(url))
    `
    )
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = convos ?? [];
  const withPreview = await Promise.all(
    list.map(async (c) => {
      const { data: last } = await supabase
        .from("messages")
        .select("body, sender_id, created_at, read_at")
        .eq("conversation_id", c.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count: unreadCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", c.id)
        .neq("sender_id", user.id)
        .is("read_at", null);

      return {
        ...c,
        lastMessage: last,
        unreadCount: unreadCount ?? 0,
      };
    })
  );

  return NextResponse.json({ conversations: withPreview });
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfileForUser(user.id);
  if (!profile || profile.role === "admin") {
    return NextResponse.json({ error: "Buyers and sellers only." }, { status: 403 });
  }

  const payload = await request.json();
  const { otherUserId, productId } = payload as { otherUserId?: string; productId?: string | null };

  if (!otherUserId || otherUserId === user.id) {
    return NextResponse.json({ error: "otherUserId required." }, { status: 400 });
  }

  let buyerId: string;
  let sellerId: string;
  if (profile.role === "buyer") {
    buyerId = user.id;
    sellerId = otherUserId;
  } else {
    sellerId = user.id;
    buyerId = otherUserId;
  }

  const supabase = createSupabaseRequestClient(accessToken);

  let find = supabase.from("conversations").select("id").eq("buyer_id", buyerId).eq("seller_id", sellerId);
  if (productId) {
    find = find.eq("product_id", productId);
  } else {
    find = find.is("product_id", null);
  }

  const { data: existing } = await find.maybeSingle();
  if (existing?.id) {
    return NextResponse.json({ conversationId: existing.id, created: false });
  }

  const { data: row, error } = await supabase
    .from("conversations")
    .insert({
      buyer_id: buyerId,
      seller_id: sellerId,
      product_id: productId ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ conversationId: row.id, created: true });
}
