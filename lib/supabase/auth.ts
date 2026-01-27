import { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "./admin";
import { Profile } from "./types";

export async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return null;
  }

  return data.user;
}

export async function getProfileForUser(userId: string) {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("sellers")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (data) {
    return {
      ...data,
      is_verified: true, // Sellers are verified if they have an account
    } as Profile | null;
  }

  return null;
}
