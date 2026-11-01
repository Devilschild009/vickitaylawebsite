import { nanoid } from "nanoid";
import { ENV } from "./_core/env";
import { getSupabaseAdmin } from "./supabase";

export type CatalogImageFolder = "products" | "collections";
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const BUNDLED_CATALOG_IMAGES = new Set([
  "/images/victayla-desktop.jpg",
  "/images/victayla-mobile.jpg",
  "/images/the-denim-diaries.jpg",
  "/images/the-gown-gallery.jpg",
  "/images/the-top-lane.jpg",
  "/images/the-dress-edit.jpg",
  "/images/denim-product-01.jpg",
]);

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80) || "image";
}

export async function createSignedCatalogUpload(folder: CatalogImageFolder, fileName: string, contentType: string) {
  if (!IMAGE_TYPES.has(contentType)) throw new Error("Choose a JPEG, PNG, WebP, or AVIF image.");
  const path = `${folder}/${nanoid(16)}-${safeFileName(fileName)}`;
  const bucketName = ENV.supabaseStorageBucket;
  const bucket = getSupabaseAdmin().storage.from(bucketName);
  const { data, error } = await bucket.createSignedUploadUrl(path, { upsert: false });
  if (error || !data?.token) throw new Error(error?.message ?? "Could not create a secure image upload.");
  const { data: publicData } = bucket.getPublicUrl(path);
  return { path, token: data.token, publicUrl: publicData.publicUrl };
}

export function isAllowedCatalogImageUrl(value: string) {
  if (BUNDLED_CATALOG_IMAGES.has(value)) return true;
  try {
    const base = new URL(ENV.supabaseUrl);
    const candidate = new URL(value);
    const publicPrefix = `/storage/v1/object/public/${ENV.supabaseStorageBucket}/`;
    return candidate.protocol === "https:" && candidate.origin === base.origin && candidate.pathname.startsWith(publicPrefix);
  } catch {
    return false;
  }
}

export async function uploadMigratedImage(path: string, bytes: Buffer, contentType: string) {
  if (!path || path.startsWith("/") || path.includes("..")) throw new Error("Invalid migrated image path.");
  if (!IMAGE_TYPES.has(contentType)) throw new Error(`Unsupported migrated image type: ${contentType}`);
  const bucket = getSupabaseAdmin().storage.from(ENV.supabaseStorageBucket);
  const { error } = await bucket.upload(path, bytes, { contentType, upsert: true, cacheControl: "31536000" });
  if (error) throw new Error(`Supabase Storage upload failed: ${error.message}`);
  return bucket.getPublicUrl(path).data.publicUrl;
}
