import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const ctx: TrpcContext = {
  user: null,
  req: { headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
};

describe("auth.me", () => {
  it("returns null until the API verifies a Supabase bearer token", async () => {
    const caller = appRouter.createCaller(ctx);
    await expect(caller.auth.me()).resolves.toBeNull();
  });
});
