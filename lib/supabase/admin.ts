import { createClient } from "@supabase/supabase-js";
import { requireEnv, supabaseServiceRoleKey, supabaseUrl } from "./config";

export function createSupabaseAdminClient() {
  return createClient(
    requireEnv(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv(supabaseServiceRoleKey, "SUPABASE_SERVICE_ROLE_KEY")
  );
}
