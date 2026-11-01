import { afterEach, describe, expect, it, vi } from "vitest";
import { adminProcedure, router } from "./_core/trpc";
import type { TrpcContext } from "./_core/context";
import { isAllowlistedVerifiedAdmin } from "./auth/supabase";

afterEach(() => vi.unstubAllEnvs());

const accessRouter = router({
  privatePing: adminProcedure.query(() => ({ ok: true })),
});

function context(user: TrpcContext["user"]): TrpcContext {
  return {
    user,
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Supabase-backed admin authorization", () => {
  it("rejects a missing application identity", async () => {
    const caller = accessRouter.createCaller(context(null));
    await expect(caller.privatePing()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects a signed-in user who is not the allowlisted administrator", async () => {
    vi.stubEnv("VICTAYLA_ADMIN_EMAIL", "owner@victayla.example");
    const caller = accessRouter.createCaller(context({ id: "user-1", email: "customer@example.com", name: "Customer", role: "user" }));
    await expect(caller.privatePing()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("accepts only a verified allowlisted account email", async () => {
    vi.stubEnv("VICTAYLA_ADMIN_EMAIL", "owner@victayla.example");
    const caller = accessRouter.createCaller(context({ id: "user-2", email: "OWNER@VICTAYLA.EXAMPLE", name: "Owner", role: "admin" }));
    await expect(caller.privatePing()).resolves.toEqual({ ok: true });
    expect(isAllowlistedVerifiedAdmin("OWNER@VICTAYLA.EXAMPLE", "2026-01-01T00:00:00Z", "owner@victayla.example")).toBe(true);
  });

  it("does not grant admin role to a matching but unconfirmed email", () => {
    expect(isAllowlistedVerifiedAdmin("owner@victayla.example", null, "owner@victayla.example")).toBe(false);
  });
});
