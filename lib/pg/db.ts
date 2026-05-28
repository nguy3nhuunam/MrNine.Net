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
}

const url = process.env.POSTGRES_URL;
if (!url) throw new Error("POSTGRES_URL is required");

export const pgClient =
  global.__mrnine_pg ??
  postgres(url, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  global.__mrnine_pg = pgClient;
}

export const db = drizzle(pgClient, { schema, logger: process.env.PG_LOG === "1" });
export { schema };
