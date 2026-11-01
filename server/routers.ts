import { z } from "zod";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { createProductImageUpload, getAdminCatalog, getCartDetails, getCollectionPage, getProductPage, getSiteAssets, listCollections, saveCollection, saveProduct, setProductVisibility } from "./store";

const imageInput = z.object({
  url: z.string().trim().max(2048).refine((value) => value.startsWith("/images/") || /^https:\/\//i.test(value)).optional(),
  altText: z.string().max(240).optional(),
}).refine((value) => Boolean(value.url), "A Supabase Storage image URL is required.");

const sizeInput = z.object({
  label: z.string().trim().min(1).max(80),
  stock: z.number().int().min(0).max(100_000),
});

const productInput = z.object({
  id: z.number().int().positive().optional(),
  collectionId: z.number().int().positive(),
  name: z.string().trim().min(1).max(220),
  description: z.string().max(10_000).default(""),
  price: z.number().min(0).max(99_999_999_999).nullable(),
  discountPercent: z.number().min(0).max(100),
  isPublished: z.boolean(),
  sizes: z.array(sizeInput).max(40),
  images: z.array(imageInput).max(500),
});

const collectionInput = z.object({
  id: z.number().int().positive().optional(),
  title: z.string().trim().min(1).max(180),
  tagline: z.string().max(240).default(""),
  description: z.string().max(10_000).default(""),
  image: imageInput.optional(),
});

const imageUploadInput = z.object({
  folder: z.enum(["products", "collections"]),
  fileName: z.string().trim().min(1).max(240),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif"]),
});

export const appRouter = router({
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
  }),
  storefront: router({
    collections: publicProcedure.query(() => listCollections()),
    siteAssets: publicProcedure.query(() => getSiteAssets()),
    collection: publicProcedure.input(z.object({ slug: z.string().min(1).max(140) })).query(({ input }) => getCollectionPage(input.slug)),
    product: publicProcedure.input(z.object({ slug: z.string().min(1).max(180) })).query(({ input }) => getProductPage(input.slug)),
    cartDetails: publicProcedure.input(z.object({ productIds: z.array(z.number().int().positive()).max(50) })).query(({ input }) => getCartDetails(input.productIds)),
  }),
  admin: router({
    catalog: adminProcedure.query(() => getAdminCatalog()),
    uploadCatalogImage: adminProcedure.input(imageUploadInput).mutation(({ input }) => createProductImageUpload(input.folder, input.fileName, input.contentType)),
    saveProduct: adminProcedure.input(productInput).mutation(({ input }) => saveProduct(input)),
    setProductVisibility: adminProcedure.input(z.object({ id: z.number().int().positive(), isPublished: z.boolean() })).mutation(({ input }) => setProductVisibility(input.id, input.isPublished)),
    saveCollection: adminProcedure.input(collectionInput).mutation(({ input }) => saveCollection(input)),
  }),
});

export type AppRouter = typeof appRouter;
