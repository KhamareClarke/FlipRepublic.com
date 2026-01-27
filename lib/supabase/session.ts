import { createSupabaseBrowserClient } from "./browser";

export async function getAccessToken() {
  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function getUser() {
  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}
