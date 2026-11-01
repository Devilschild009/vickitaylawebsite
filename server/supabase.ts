import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./_core/env";

let cachedClient: SupabaseClient | null = null;
let cachedFingerprint = "";

export function isSupabaseServerConfigured() {
  return Boolean(ENV.supabaseUrl && ENV.supabaseServiceRoleKey);
}

export function getSupabaseAdmin(): SupabaseClient {
  const url = ENV.supabaseUrl;
  const key = ENV.supabaseServiceRoleKey;
  if (!url || !key) throw new Error("Supabase server configuration is missing.");
  const fingerprint = `${url}\u0000${key}`;
  if (!cachedClient || cachedFingerprint !== fingerprint) {
    cachedClient = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    cachedFingerprint = fingerprint;
  }
  return cachedClient;
}
