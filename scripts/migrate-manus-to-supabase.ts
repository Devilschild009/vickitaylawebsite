import "dotenv/config";
import mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2";
import { eq } from "drizzle-orm";
import { collections, dataMigrations, productImages, productSizes, products, siteAssets } from "../drizzle/schema";
import { closeDb, getDb } from "../server/db";
import { uploadMigratedImage } from "../server/storage";

type LegacyCollection = RowDataPacket & {
  id: number; slug: string; title: string; tagline?: string | null; description?: string | null;
  imageUrl?: string | null; sortOrder?: number | null; isActive?: number | boolean | null;
};
type LegacyProduct = RowDataPacket & {
  id: number; collectionId: number; slug: string; name: string; description?: string | null;
  price?: number | string | null; discountPercent?: number | string | null; isPublished?: number | boolean | null;
  sortOrder?: number | null;
};
type LegacyImage = RowDataPacket & { id: number; productId: number; imageUrl: string; altText?: string | null; sortOrder?: number | null };
type LegacySize = RowDataPacket & { id: number; productId: number; label: string; stock?: number | null; sortOrder?: number | null };

const IMPORT_KEY = "manus-store-to-supabase-v1";
const HERO_ASSETS = [
  { key: "hero-desktop", source: "/manus-storage/victayla-desktop_918cbc4c.jpg" },
  { key: "hero-mobile", source: "/manus-storage/victayla-mobile_4b24aabe.jpg" },
];
const MIME_EXTENSIONS: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif" };
const IMAGE_TYPES = new Set(Object.values(MIME_EXTENSIONS));

function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/(?:mysql|postgres(?:ql)?):\/\/[^\s]+/gi, "[connection string redacted]");
}

function imageType(contentType: string | null, sourceKey: string) {
  const reported = (contentType ?? "").split(";")[0].trim().toLowerCase();
  if (IMAGE_TYPES.has(reported)) return reported;
  const extension = sourceKey.slice(sourceKey.lastIndexOf(".")).toLowerCase();
  const inferred = MIME_EXTENSIONS[extension];
  if (!inferred) throw new Error(`Unsupported image format for ${sourceKey.split("/").pop() ?? "asset"}.`);
  return inferred;
}

function storageKey(sourceUrl: string) {
  const encoded = sourceUrl.slice("/manus-storage/".length).split("?")[0];
  const decoded = decodeURIComponent(encoded);
  const parts = decoded.split("/");
  if (!decoded || parts.some((part) => !part || part === "." || part === "..")) throw new Error("Invalid legacy storage key.");
  return `legacy/${parts.map((part) => part.replace(/[^a-zA-Z0-9._-]/g, "_")).join("/")}`;
}

async function downloadLegacyImage(sourceUrl: string) {
  if (!sourceUrl.startsWith("/manus-storage/")) return sourceUrl;
  const sourceKey = decodeURIComponent(sourceUrl.slice("/manus-storage/".length).split("?")[0]);
  const apiBase = process.env.MANUS_API_URL?.replace(/\/+$/, "");
  const apiKey = process.env.MANUS_API_KEY;
  if (!apiBase || !apiKey) throw new Error("This image needs the Manus runtime. Run the migration in the Manus project environment with its storage variables available.");

  const signedResponse = await fetch(`${apiBase}/v1/storage/presign/get?path=${encodeURIComponent(sourceKey)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!signedResponse.ok) throw new Error(`Manus could not create a signed image read (${signedResponse.status}).`);
  const signedPayload = await signedResponse.json() as { url?: string; error?: string };
  if (!signedPayload.url) throw new Error(signedPayload.error || "Manus did not return a signed image address.");

  const fileResponse = await fetch(signedPayload.url);
  if (!fileResponse.ok) throw new Error(`The legacy image download failed (${fileResponse.status}).`);
  const bytes = Buffer.from(await fileResponse.arrayBuffer());
  if (bytes.length > 8 * 1024 * 1024) throw new Error("A legacy image is larger than the Supabase bucket’s 8 MB limit.");
  const contentType = imageType(fileResponse.headers.get("content-type"), sourceKey);
  return uploadMigratedImage(storageKey(sourceUrl), bytes, contentType);
}

async function main() {
  const sourceUrl = process.env.MANUS_SOURCE_DATABASE_URL || process.env.DATABASE_URL;
  const targetUrl = process.env.SUPABASE_DB_URL;
  if (!sourceUrl) throw new Error("Set MANUS_SOURCE_DATABASE_URL or run this inside the Manus project with DATABASE_URL available.");
  if (!targetUrl) throw new Error("Set SUPABASE_DB_URL to the Supabase PostgreSQL transaction-pooler connection string.");
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server before importing.");
  const db = await getDb();
  if (!db) throw new Error("Supabase PostgreSQL is not configured.");
  const refresh = process.argv.includes("--refresh");
  const prior = await db.select({ key: dataMigrations.key }).from(dataMigrations).where(eq(dataMigrations.key, IMPORT_KEY)).limit(1);
  if (prior.length && !refresh) {
    console.log(`Migration ${IMPORT_KEY} already completed; no rows or objects were changed.`);
    await closeDb();
    return;
  }
  if (prior.length && refresh) console.log("Refreshing the staging copy from Manus. Imported rows with matching slugs will be updated.");

  const source = await mysql.createConnection(sourceUrl);
  try {
    const [[collectionRows], [productRows], [imageRows], [sizeRows]] = await Promise.all([
      source.query<LegacyCollection[]>("SELECT * FROM collections ORDER BY sortOrder, id"),
      source.query<LegacyProduct[]>("SELECT * FROM products ORDER BY sortOrder, id"),
      source.query<LegacyImage[]>("SELECT * FROM productImages ORDER BY productId, sortOrder, id"),
      source.query<LegacySize[]>("SELECT * FROM productSizes ORDER BY productId, sortOrder, id"),
    ]);

    const media = new Map<string, string>();
    const moveMedia = async (url: string | null | undefined) => {
      if (!url) return null;
      if (!url.startsWith("/manus-storage/")) return url;
      const existing = media.get(url);
      if (existing) return existing;
      const moved = await downloadLegacyImage(url);
      media.set(url, moved);
      return moved;
    };

    for (const asset of HERO_ASSETS) await moveMedia(asset.source);
    for (const row of collectionRows) await moveMedia(row.imageUrl);
    for (const row of imageRows) await moveMedia(row.imageUrl);

    const collectionIds = new Map<number, number>();
    const productIds = new Map<number, number>();
    const stats = { collections: collectionRows.length, products: productRows.length, images: imageRows.length, sizes: sizeRows.length, assets: media.size };

    await db.transaction(async (tx) => {
      for (const row of collectionRows) {
        const cover = await moveMedia(row.imageUrl);
        const [saved] = await tx.insert(collections).values({
          slug: row.slug,
          title: row.title,
          tagline: row.tagline ?? "",
          description: row.description ?? "",
          imageUrl: cover,
          sortOrder: Number(row.sortOrder ?? 100),
          isActive: Boolean(row.isActive ?? true),
        }).onConflictDoUpdate({
          target: collections.slug,
          set: { title: row.title, tagline: row.tagline ?? "", description: row.description ?? "", imageUrl: cover, sortOrder: Number(row.sortOrder ?? 100), isActive: Boolean(row.isActive ?? true), updatedAt: new Date() },
        }).returning({ id: collections.id });
        collectionIds.set(Number(row.id), saved.id);
      }

      if (!collectionRows.some((row) => row.slug === "new-edit")) {
        await tx.insert(collections).values({
          slug: "new-edit",
          title: "New Edit",
          tagline: "Your next signature edit.",
          description: "A new space for the pieces you love.",
          imageUrl: null,
          sortOrder: 5,
          isActive: true,
        }).onConflictDoNothing({ target: collections.slug });
      }

      for (const asset of HERO_ASSETS) {
        const value = await moveMedia(asset.source);
        if (value) await tx.insert(siteAssets).values({ key: asset.key, value }).onConflictDoUpdate({ target: siteAssets.key, set: { value, updatedAt: new Date() } });
      }

      for (const row of productRows) {
        const collectionId = collectionIds.get(Number(row.collectionId));
        if (!collectionId) throw new Error(`Product ${row.slug} references a collection absent from the source database.`);
        const [saved] = await tx.insert(products).values({
          collectionId,
          slug: row.slug,
          name: row.name,
          description: row.description ?? "",
          price: row.price === null || row.price === undefined ? null : Number(row.price),
          discountPercent: Number(row.discountPercent ?? 0),
          isPublished: Boolean(row.isPublished ?? false),
          sortOrder: Number(row.sortOrder ?? 100),
        }).onConflictDoUpdate({
          target: products.slug,
          set: { collectionId, name: row.name, description: row.description ?? "", price: row.price === null || row.price === undefined ? null : Number(row.price), discountPercent: Number(row.discountPercent ?? 0), isPublished: Boolean(row.isPublished ?? false), sortOrder: Number(row.sortOrder ?? 100), updatedAt: new Date() },
        }).returning({ id: products.id });
        productIds.set(Number(row.id), saved.id);
        await tx.delete(productImages).where(eq(productImages.productId, saved.id));
        await tx.delete(productSizes).where(eq(productSizes.productId, saved.id));
      }

      const newImages = [];
      for (const row of imageRows) {
        const productId = productIds.get(Number(row.productId));
        if (!productId) continue;
        const imageUrl = await moveMedia(row.imageUrl);
        if (imageUrl) newImages.push({ productId, imageUrl, altText: row.altText ?? "", sortOrder: Number(row.sortOrder ?? 0) });
      }
      if (newImages.length) await tx.insert(productImages).values(newImages);

      const newSizes = sizeRows.flatMap((row) => {
        const productId = productIds.get(Number(row.productId));
        return productId ? [{ productId, label: row.label, stock: Math.max(0, Number(row.stock ?? 0)), sortOrder: Number(row.sortOrder ?? 0) }] : [];
      });
      if (newSizes.length) await tx.insert(productSizes).values(newSizes);

      await tx.insert(dataMigrations).values({ key: IMPORT_KEY, stats: JSON.stringify(stats) }).onConflictDoUpdate({
        target: dataMigrations.key,
        set: { completedAt: new Date(), stats: JSON.stringify(stats) },
      });
    });

    console.log(`Migration completed: ${stats.collections} collections, ${stats.products} products, ${stats.images} product images, ${stats.sizes} sizes, ${stats.assets} moved media objects.`);
  } finally {
    await source.end();
    await closeDb();
  }
}

main().catch((error) => {
  console.error(`Migration failed: ${safeError(error)}`);
  process.exitCode = 1;
});
