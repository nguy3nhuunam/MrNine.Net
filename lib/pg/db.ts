/**
 * Single Postgres pool — share across NextAuth + dashboard + admin.
 * DSN: POSTGRES_URL=postgresql://mrnine:mrnine_dev@localhost:5432/mrnine
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __mrnine_pg: ReturnType<typeof postgres> | undefined;
  // eslint-disable-next-line no-var
  var __mrnine_drizzle: ReturnType<typeof drizzle> | undefined;
}

function makeClient() {
  const url = process.env.POSTGRES_URL;
  if (!url) throw new Error("POSTGRES_URL is required");
  return postgres(url, { max: 10, idle_timeout: 30, connect_timeout: 10 });
}

function getClient() {
  if (global.__mrnine_pg) return global.__mrnine_pg;
  const c = makeClient();
  if (process.env.NODE_ENV !== "production") global.__mrnine_pg = c;
  return c;
}

// Lazy proxy: postgres() only runs when a query is executed, not at module-eval.
// Tránh lỗi "Invalid URL" làm fail Vercel build "Collecting page data".
export const pgClient: ReturnType<typeof postgres> = new Proxy({} as ReturnType<typeof postgres>, {
  get(_t, prop) {
    const c = getClient();
    const v = (c as unknown as Record<string | symbol, unknown>)[prop as string];
    return typeof v === "function" ? (v as (...args: unknown[]) => unknown).bind(c) : v;
  },
  apply(_t, _this, args) {
    const c = getClient();
    return (c as unknown as (...args: unknown[]) => unknown)(...args);
  },
}) as ReturnType<typeof postgres>;

export const db: ReturnType<typeof drizzle> = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_t, prop) {
    if (!global.__mrnine_drizzle) {
      global.__mrnine_drizzle = drizzle(getClient(), { schema, logger: process.env.PG_LOG === "1" });
    }
    const v = (global.__mrnine_drizzle as unknown as Record<string | symbol, unknown>)[prop as string];
    return typeof v === "function" ? (v as (...args: unknown[]) => unknown).bind(global.__mrnine_drizzle) : v;
  },
}) as ReturnType<typeof drizzle>;

export { schema };
