import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRequestClient } from "@/lib/supabase/request";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserFromRequest } from "@/lib/supabase/auth";
import { findBannedListingTerms } from "@/lib/content-filter";
import { sendEmail } from "@/lib/email";
import { tplNewMessageRecipient } from "@/lib/email-templates";

export const runtime = "nodejs";

async function assertParticipant(
  supabase: ReturnType<typeof createSupabaseRequestClient>,
  conversationId: string,
  userId: string
) {
  const { data: c } = await supabase
    .from("conversations")
    .select("id, buyer_id, seller_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (!c) return null;
  if (c.buyer_id !== userId && c.seller_id !== userId) return null;
  return c;
}

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseRequestClient(accessToken);
  const ok = await assertParticipant(supabase, context.params.id, user.id);
  if (!ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", context.params.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const body = (payload.body as string)?.trim() ?? "";
  if (!body || body.length > 8000) {
    return NextResponse.json({ error: "Message body required (max 8000 chars)." }, { status: 400 });
  }

  const banned = findBannedListingTerms(body);
  if (banned.length > 0) {
    return NextResponse.json({ error: "Message contains blocked terms.", terms: banned }, { status: 400 });
  }

  const supabase = createSupabaseRequestClient(accessToken);
  const ok = await assertParticipant(supabase, context.params.id, user.id);
  if (!ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: msg, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: context.params.id,
      sender_id: user.id,
      body,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", context.params.id);

  const { empireDispatch } = await import("@/lib/empire-os/dispatch");
  void empireDispatch({
    event_type: "message.sent",
    payload: { body_len: body.length, preview: body.slice(0, 200), conversation_id: context.params.id },
    actor_user_id: user.id,
    product_id: null,
  }).catch((e) => console.error("[empire_os]", e));

  try {
    const admin = createSupabaseAdminClient();
    const recipientId = ok.buyer_id === user.id ? ok.seller_id : ok.buyer_id;
    const { data: recipientAuth } = await admin.auth.admin.getUserById(recipientId);
    const to = recipientAuth?.user?.email;
    if (to) {
      let productName: string | null = null;
      const { data: convRow } = await admin
        .from("conversations")
        .select("product_id")
        .eq("id", context.params.id)
        .maybeSingle();
      if (convRow?.product_id) {
        const { data: prod } = await admin.from("products").select("name").eq("id", convRow.product_id).maybeSingle();
        productName = prod?.name ?? null;
      }
      const base = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const mail = tplNewMessageRecipient({
        preview: body,
        productName,
        messagesUrl: `${base}/messages`,
      });
      await sendEmail({ to, ...mail });
    }
  } catch (e) {
    console.error("new message email:", e);
  }

  return NextResponse.json({ message: msg });
}
