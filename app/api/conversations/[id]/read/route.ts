import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRequestClient } from "@/lib/supabase/request";
import { getUserFromRequest } from "@/lib/supabase/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseRequestClient(accessToken);
  const { data: c } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", context.params.id)
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .maybeSingle();

  if (!c) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("messages")
    .update({ read_at: now })
    .eq("conversation_id", context.params.id)
    .neq("sender_id", user.id)
    .is("read_at", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
