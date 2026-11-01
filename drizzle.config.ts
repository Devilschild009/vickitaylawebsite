import { defineConfig } from "drizzle-kit";

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  throw new Error("SUPABASE_DB_URL is required to generate or apply Supabase PostgreSQL migrations.");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./supabase/migrations",
  dialect: "postgresql",
  dbCredentials: { url: connectionString },
  strict: true,
  verbose: true,
});
