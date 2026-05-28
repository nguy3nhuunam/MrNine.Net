import "dotenv/config";
import type { Config } from "drizzle-kit";

if (!process.env.POSTGRES_URL) {
  throw new Error("POSTGRES_URL is required for drizzle-kit");
}

export default {
  schema: "./lib/pg/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.POSTGRES_URL },
  verbose: true,
  strict: true,
} satisfies Config;
