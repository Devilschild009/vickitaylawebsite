import type { Request } from "express";
import { ENV } from "../_core/env";
import { getSupabaseAdmin, isSupabaseServerConfigured } from "../supabase";

export type AuthenticatedUser = {
  id: string;
  email: string | null;
  name: string | null;
  role: "user" | "admin";
};

export function isAllowlistedVerifiedAdmin(email: string | null, confirmedAt: string | null | undefined, allowlistedEmail: string) {
  return Boolean(
    email && confirmedAt && allowlistedEmail &&
    email.trim().toLowerCase() === allowlistedEmail.trim().toLowerCase()
  );
}

export async function authenticateSupabaseRequest(req: Request): Promise<AuthenticatedUser | null> {
  const authorization = req.headers.authorization;
  const token = typeof authorization === "string" && authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";
  if (!token || !isSupabaseServerConfigured()) return null;

  try {
    const { data, error } = await getSupabaseAdmin().auth.getUser(token);
    if (error || !data.user) return null;
    const email = data.user.email?.trim().toLowerCase() ?? null;
    const metadata = data.user.user_metadata ?? {};
    const name = typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string" ? metadata.name : email;
    const confirmedAt = data.user.email_confirmed_at ?? data.user.confirmed_at ?? null;
    const role = isAllowlistedVerifiedAdmin(email, confirmedAt, ENV.victaylaAdminEmail) ? "admin" : "user";
    return { id: data.user.id, email, name, role };
  } catch (error) {
    console.warn("[Auth] Supabase token verification failed:", error instanceof Error ? error.message : "unknown error");
    return null;
  }
}
