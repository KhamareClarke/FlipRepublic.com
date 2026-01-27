import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./config";

export function createSupabaseServerClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase server env vars are missing.");
  }

  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set(name, value, options) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name, options) {
        cookieStore.set({ name, value: "", ...options });
      },
    },
  });
}
