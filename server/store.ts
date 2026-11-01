import { and, asc, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { collections, productImages, productSizes, products, siteAssets, type Product } from "../drizzle/schema";
import { getDb } from "./db";
import { createSignedCatalogUpload, isAllowedCatalogImageUrl } from "./storage";

const DEFAULT_COLLECTIONS = [
  { slug: "denim", title: "The Denim Diaries", tagline: "Classic. Versatile. Always you.", description: "Denim for the days that become your favourites.", imageUrl: "/images/the-denim-diaries.jpg", sortOrder: 1, isActive: true },
  { slug: "gowns", title: "The Gown Gallery", tagline: "For moments that matter.", description: "Considered silhouettes for the occasions worth remembering.", imageUrl: "/images/the-gown-gallery.jpg", sortOrder: 2, isActive: true },
  { slug: "tops", title: "The Top Lane", tagline: "Chic tops for every mood.", description: "Easy pieces with a little something extra.", imageUrl: "/images/the-top-lane.jpg", sortOrder: 3, isActive: true },
  { slug: "dresses", title: "The Dress Edit", tagline: "Effortless elegance, always.", description: "One-piece dressing, thoughtfully done.", imageUrl: "/images/the-dress-edit.jpg", sortOrder: 4, isActive: true },
  { slug: "new-edit", title: "New Edit", tagline: "Your next signature edit.", description: "A new space for the pieces you love.", imageUrl: null, sortOrder: 5, isActive: true },
] as const;

const DEFAULT_SITE_ASSETS = [
  { key: "hero-desktop", value: "/images/victayla-desktop.jpg" },
  { key: "hero-mobile", value: "/images/victayla-mobile.jpg" },
] as const;

const STATIC_MEDIA_FALLBACKS: Array<[string, string]> = [
  ["victayla-desktop", "/images/victayla-desktop.jpg"],
  ["victayla-mobile", "/images/victayla-mobile.jpg"],
  ["the-denim-diaries", "/images/the-denim-diaries.jpg"],
  ["the-gown-gallery", "/images/the-gown-gallery.jpg"],
  ["the-top-lane", "/images/the-top-lane.jpg"],
  ["the-dress-edit", "/images/the-dress-edit.jpg"],
  ["denim-product-01", "/images/denim-product-01.jpg"],
];

function publicMediaUrl(value: string | null) {
  if (!value?.startsWith("/manus-storage/")) return value;
  return STATIC_MEDIA_FALLBACKS.find(([key]) => value.includes(key))?.[1] ?? value;
}

export type ImageInput = { url?: string; altText?: string };
export type SaveProductInput = {
  id?: number;
  collectionId: number;
  name: string;
  description: string;
  price: number | null;
  discountPercent: number;
  isPublished: boolean;
  sizes: Array<{ label: string; stock: number }>;
  images: ImageInput[];
};
export type SaveCollectionInput = {
  id?: number;
  title: string;
  tagline: string;
  description: string;
  image?: ImageInput;
};

async function requiredDb() {
  const db = await getDb();
  if (!db) throw new Error("Supabase PostgreSQL is not configured. Set SUPABASE_DB_URL.");
  return db;
}

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 130) || `item-${nanoid(8)}`;
}

async function ensureSeedData() {
  const db = await requiredDb();
  try {
    await db.insert(collections).values([...DEFAULT_COLLECTIONS]).onConflictDoNothing({ target: collections.slug });
  } catch (error) {
    console.error("Failed to seed default collections:", error);
    throw error;
  }
  await db.insert(siteAssets).values([...DEFAULT_SITE_ASSETS]).onConflictDoNothing({ target: siteAssets.key });

  const existing = await db.select({ id: products.id }).from(products).where(eq(products.slug, "victayla-the-jeans")).limit(1);
  if (existing.length === 0) {
    const denim = await db.select({ id: collections.id }).from(collections).where(eq(collections.slug, "denim")).limit(1);
    if (denim[0]) {
      const inserted = await db.insert(products).values({
        collectionId: denim[0].id,
        slug: "victayla-the-jeans",
        name: "Victayla The Jeans",
        description: "The supplied denim look. Set a price and size availability in the admin area before adding it to the bag.",
        price: null,
        discountPercent: 0,
        isPublished: true,
        sortOrder: 1,
      }).returning({ id: products.id });
      if (inserted[0]) {
        await db.insert(productImages).values({
          productId: inserted[0].id,
          imageUrl: "/images/denim-product-01.jpg",
          altText: "Victayla The Jeans — supplied denim product and detail board",
          sortOrder: 0,
        });
      }
    }
  }
  return db;
}

async function withProductDetails(db: Awaited<ReturnType<typeof requiredDb>>, product: Product) {
  const [images, sizes] = await Promise.all([
    db.select().from(productImages).where(eq(productImages.productId, product.id)).orderBy(asc(productImages.sortOrder), asc(productImages.id)),
    db.select().from(productSizes).where(eq(productSizes.productId, product.id)).orderBy(asc(productSizes.sortOrder), asc(productSizes.id)),
  ]);
  return { ...product, images, sizes };
}

function publicProduct(product: Awaited<ReturnType<typeof withProductDetails>>) {
  return { ...product, images: product.images.map((image) => ({ ...image, imageUrl: publicMediaUrl(image.imageUrl) ?? image.imageUrl })) };
}

export async function listCollections() {
  const db = await ensureSeedData();
  const rows = await db.select().from(collections).where(eq(collections.isActive, true)).orderBy(asc(collections.sortOrder), asc(collections.id));
  return rows.map((collection) => ({ ...collection, imageUrl: publicMediaUrl(collection.imageUrl) }));
}

export async function getSiteAssets() {
  const db = await ensureSeedData();
  const rows = await db.select().from(siteAssets);
  return Object.fromEntries(rows.map((row) => [row.key, publicMediaUrl(row.value) ?? row.value]));
}

export async function getCollectionPage(slug: string) {
  const db = await ensureSeedData();
  const found = await db.select().from(collections).where(and(eq(collections.slug, slug), eq(collections.isActive, true))).limit(1);
  if (!found[0]) return null;
  const rows = await db.select().from(products).where(and(eq(products.collectionId, found[0].id), eq(products.isPublished, true))).orderBy(asc(products.sortOrder), asc(products.id));
  return {
    collection: { ...found[0], imageUrl: publicMediaUrl(found[0].imageUrl) },
    products: await Promise.all(rows.map(async (product) => publicProduct(await withProductDetails(db, product)))),
  };
}

export async function getProductPage(slug: string) {
  const db = await ensureSeedData();
  const rows = await db.select().from(products).where(and(eq(products.slug, slug), eq(products.isPublished, true))).limit(1);
  if (!rows[0]) return null;
  const product = publicProduct(await withProductDetails(db, rows[0]));
  const collection = await db.select().from(collections).where(eq(collections.id, product.collectionId)).limit(1);
  return { ...product, collection: collection[0] ? { ...collection[0], imageUrl: publicMediaUrl(collection[0].imageUrl) } : null };
}

export async function getCartDetails(productIds: number[]) {
  const db = await ensureSeedData();
  const ids = [...new Set(productIds)].filter((id) => Number.isInteger(id) && id > 0).slice(0, 50);
  if (ids.length === 0) return [];
  const rows = await db.select().from(products).where(and(inArray(products.id, ids), eq(products.isPublished, true)));
  return Promise.all(rows.map(async (product) => publicProduct(await withProductDetails(db, product))));
}

export async function getAdminCatalog() {
  const db = await ensureSeedData();
  const [collectionRows, productRows] = await Promise.all([
    db.select().from(collections).orderBy(asc(collections.sortOrder), asc(collections.id)),
    db.select().from(products).orderBy(asc(products.sortOrder), asc(products.id)),
  ]);
  return { collections: collectionRows, products: await Promise.all(productRows.map((product) => withProductDetails(db, product))) };
}

export async function saveProduct(input: SaveProductInput) {
  const db = await ensureSeedData();
  const cleanName = input.name.trim();
  const existing = input.id ? await db.select().from(products).where(eq(products.id, input.id)).limit(1) : [];
  if (input.id && !existing[0]) throw new Error("Product not found.");
  const slug = existing[0]?.slug ?? `${slugify(cleanName)}-${nanoid(5).toLowerCase()}`;
  const collectionExists = await db.select({ id: collections.id }).from(collections).where(and(eq(collections.id, input.collectionId), eq(collections.isActive, true))).limit(1);
  if (!collectionExists[0]) throw new Error("Choose an active collection.");

  const images = input.images.filter((image) => image.url?.trim()).map((image) => ({
    url: image.url!.trim(),
    altText: (image.altText ?? "").slice(0, 240),
  }));
  if (images.some((image) => !isAllowedCatalogImageUrl(image.url))) {
    throw new Error("Product images must be uploaded to Victayla’s Supabase Storage bucket.");
  }

  const now = new Date();
  let productId: number;
  if (existing[0]) {
    productId = existing[0].id;
    await db.update(products).set({
      collectionId: input.collectionId,
      name: cleanName,
      description: input.description.trim(),
      price: input.price,
      discountPercent: input.discountPercent,
      isPublished: input.isPublished,
      updatedAt: now,
    }).where(eq(products.id, productId));
    await db.delete(productImages).where(eq(productImages.productId, productId));
    await db.delete(productSizes).where(eq(productSizes.productId, productId));
  } else {
    const inserted = await db.insert(products).values({
      collectionId: input.collectionId,
      slug,
      name: cleanName,
      description: input.description.trim(),
      price: input.price,
      discountPercent: input.discountPercent,
      isPublished: input.isPublished,
      sortOrder: 100,
    }).returning({ id: products.id });
    if (!inserted[0]) throw new Error("Product could not be saved.");
    productId = inserted[0].id;
  }

  if (images.length) {
    await db.insert(productImages).values(images.map((image, index) => ({
      productId,
      imageUrl: image.url,
      altText: image.altText || `${cleanName} image ${index + 1}`,
      sortOrder: index,
    })));
  }
  const normalizedSizes = input.sizes.map((size) => ({
    label: size.label.trim(),
    stock: Math.max(0, Math.floor(size.stock)),
  })).filter((size) => size.label);
  if (normalizedSizes.length) {
    await db.insert(productSizes).values(normalizedSizes.map((size, index) => ({ productId, ...size, sortOrder: index })));
  }
  return { id: productId, slug };
}

export async function setProductVisibility(id: number, isPublished: boolean) {
  const db = await ensureSeedData();
  await db.update(products).set({ isPublished, updatedAt: new Date() }).where(eq(products.id, id));
  return { success: true };
}

export async function saveCollection(input: SaveCollectionInput) {
  const db = await ensureSeedData();
  const existing = input.id ? await db.select().from(collections).where(eq(collections.id, input.id)).limit(1) : [];
  if (input.id && !existing[0]) throw new Error("Collection not found.");
  const imageUrl = input.image?.url?.trim();
  if (imageUrl && !isAllowedCatalogImageUrl(imageUrl)) throw new Error("Collection covers must be uploaded to Victayla’s Supabase Storage bucket.");

  if (existing[0]) {
    await db.update(collections).set({
      title: input.title.trim(),
      tagline: input.tagline.trim(),
      description: input.description.trim(),
      ...(imageUrl ? { imageUrl } : {}),
      updatedAt: new Date(),
    }).where(eq(collections.id, input.id!));
    return { id: input.id!, slug: existing[0].slug };
  }
  const slug = `${slugify(input.title)}-${nanoid(4).toLowerCase()}`;
  const inserted = await db.insert(collections).values({
    slug,
    title: input.title.trim(),
    tagline: input.tagline.trim(),
    description: input.description.trim(),
    imageUrl: imageUrl ?? null,
    sortOrder: 100,
    isActive: true,
  }).returning({ id: collections.id });
  return { id: inserted[0]?.id, slug };
}

export async function createProductImageUpload(folder: "products" | "collections", fileName: string, contentType: string) {
  return createSignedCatalogUpload(folder, fileName, contentType);
}
