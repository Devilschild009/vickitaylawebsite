import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isAllowedCatalogImageUrl } from "./storage";

beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "https://project.example.supabase.co");
  vi.stubEnv("SUPABASE_STORAGE_BUCKET", "victayla-media");
});

afterEach(() => vi.unstubAllEnvs());

describe("catalog image references", () => {
  it("accepts the bundled denim product image used by the initial draft", () => {
    expect(isAllowedCatalogImageUrl("/images/denim-product-01.jpg")).toBe(true);
  });

  it("accepts public images from the configured Supabase bucket", () => {
    expect(isAllowedCatalogImageUrl("https://project.example.supabase.co/storage/v1/object/public/victayla-media/products/one.jpg")).toBe(true);
  });

  it("rejects other hosts and other Supabase buckets", () => {
    expect(isAllowedCatalogImageUrl("https://attacker.example/image.jpg")).toBe(false);
    expect(isAllowedCatalogImageUrl("https://project.example.supabase.co/storage/v1/object/public/other/images/one.jpg")).toBe(false);
  });

  it("rejects arbitrary local files", () => {
    expect(isAllowedCatalogImageUrl("/images/private.jpg")).toBe(false);
    expect(isAllowedCatalogImageUrl("/images/../index.html")).toBe(false);
  });
});
