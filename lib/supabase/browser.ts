import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./config";

export function createSupabaseBrowserClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase client env vars are missing.");
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
