import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { authenticateSupabaseRequest, type AuthenticatedUser } from "../auth/supabase";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: AuthenticatedUser | null;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  return {
    req: opts.req,
    res: opts.res,
    user: await authenticateSupabaseRequest(opts.req),
  };
}
