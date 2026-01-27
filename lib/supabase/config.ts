export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export function requireEnv(value: string, name: string) {
  if (!value) {
    throw new Error(`Missing ${name} environment variable.`);
  }

  return value;
}
