import { createClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "./config";

export function createSupabaseRequestClient(accessToken?: string) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase request env vars are missing.");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  });
}
