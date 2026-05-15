import { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "./admin";
import { Profile, Role } from "./types";

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

/** Resolve account role from sellers or buyers table (used by APIs). */
export async function getProfileForUser(userId: string): Promise<Profile | null> {
  const supabase = createSupabaseAdminClient();

  const { data: seller } = await supabase.from("sellers").select("*").eq("user_id", userId).maybeSingle();

  if (seller) {
    const role = (seller.role as Role) || "seller";
    return {
      user_id: seller.user_id,
      username: seller.username,
      role: role === "admin" ? "admin" : "seller",
      is_verified: Boolean(seller.is_admin_approved),
      is_banned: Boolean(seller.is_banned),
      created_at: seller.created_at,
    };
  }

  const { data: buyer } = await supabase.from("buyers").select("*").eq("user_id", userId).maybeSingle();

  if (buyer) {
    return {
      user_id: buyer.user_id,
      username: buyer.username ?? null,
      role: "buyer",
      is_verified: false,
      is_banned: Boolean((buyer as { is_banned?: boolean }).is_banned),
      created_at: buyer.created_at,
    };
  }

  return null;
}
