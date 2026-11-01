import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const collections = pgTable("collections", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 140 }).notNull().unique(),
  title: varchar("title", { length: 180 }).notNull(),
  tagline: varchar("tagline", { length: 240 }).notNull().default(""),
  description: text("description"),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").notNull().default(100),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("collections_active_sort_idx").on(table.isActive, table.sortOrder)]);

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  collectionId: integer("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }),
  slug: varchar("slug", { length: 180 }).notNull().unique(),
  name: varchar("name", { length: 220 }).notNull(),
  description: text("description"),
  price: numeric("price", { precision: 12, scale: 2, mode: "number" }),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2, mode: "number" }).notNull().default(0),
  isPublished: boolean("is_published").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(100),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("products_collection_published_sort_idx").on(table.collectionId, table.isPublished, table.sortOrder)]);

export const productImages = pgTable("product_images", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  altText: varchar("alt_text", { length: 240 }).notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("product_images_product_sort_idx").on(table.productId, table.sortOrder)]);

export const productSizes = pgTable("product_sizes", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 80 }).notNull(),
  stock: integer("stock").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("product_sizes_product_sort_idx").on(table.productId, table.sortOrder)]);

export const siteAssets = pgTable("site_assets", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dataMigrations = pgTable("data_migrations", {
  key: varchar("key", { length: 120 }).primaryKey(),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  stats: text("stats").notNull().default("{}"),
});

export type Collection = typeof collections.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductImage = typeof productImages.$inferSelect;
export type ProductSize = typeof productSizes.$inferSelect;
export type SiteAsset = typeof siteAssets.$inferSelect;
