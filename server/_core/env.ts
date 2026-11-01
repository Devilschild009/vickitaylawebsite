// Server-only Supabase and deployment settings. VITE_ values are deliberately
// kept in the browser-safe client module instead of this server environment.
export const ENV = {
  get supabaseUrl() { return process.env.SUPABASE_URL ?? ""; },
  get supabaseAnonKey() { return process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY ?? ""; },
  get supabaseServiceRoleKey() { return process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""; },
  get supabaseStorageBucket() { return process.env.SUPABASE_STORAGE_BUCKET ?? "victayla-media"; },
  get victaylaAdminEmail() { return (process.env.VICTAYLA_ADMIN_EMAIL ?? "").trim().toLowerCase(); },
  get corsAllowedOrigins() { return (process.env.CORS_ALLOWED_ORIGINS ?? "").split(",").map((origin) => origin.trim()).filter(Boolean); },
};
