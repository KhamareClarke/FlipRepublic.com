import { NextResponse } from "next/server";
import { createSupabaseRequestClient } from "@/lib/supabase/request";

export async function GET() {
  const supabase = createSupabaseRequestClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ categories: data ?? [] });
}
