import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL ?? "";
const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
export const SUPABASE_STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET ?? "victayla-media";
export const isSupabaseConfigured = Boolean(url && key);

let browserClient: SupabaseClient | null = null;
export function getBrowserSupabase() {
  if (!url || !key) return null;
  if (!browserClient) {
    browserClient = createClient(url, key, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
    });
  }
  return browserClient;
}
