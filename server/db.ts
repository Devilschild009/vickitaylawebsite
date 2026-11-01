import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../drizzle/schema";

export type StoreDb = PostgresJsDatabase<typeof schema>;
let _db: StoreDb | null = null;
let _sql: ReturnType<typeof postgres> | null = null;
let _url = "";

export async function getDb(): Promise<StoreDb | null> {
  const url = process.env.SUPABASE_DB_URL ?? "";
  if (!url) return null;
  if (_db && _url === url) return _db;
  if (_sql) await _sql.end({ timeout: 1 }).catch(() => undefined);
  _url = url;
  _sql = postgres(url, {
    max: Math.min(4, Math.max(1, Number(process.env.DATABASE_POOL_MAX ?? 1))),
    prepare: false,
    ssl: "require",
    connect_timeout: 10,
    idle_timeout: 20,
  });
  _db = drizzle(_sql, { schema });
  return _db;
}

export async function closeDb() {
  if (_sql) await _sql.end({ timeout: 5 });
  _sql = null;
  _db = null;
  _url = "";
}
