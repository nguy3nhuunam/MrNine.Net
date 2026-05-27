// Lightweight health probe for uptime monitors. Returns 200 if the server
// can boot and reach Mongo, 503 otherwise. No auth required — explicitly
// added to PUBLIC_PREFIXES in proxy.ts.

import { NextResponse } from "next/server";
import { rateLimitedRoute } from "@/lib/safe-json-route";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function pingMongo(): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  if (!clientPromise) return { ok: false, error: "no-uri" };
  const started = Date.now();
  try {
    const client = await Promise.race([
      clientPromise,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500)),
    ]);
    await Promise.race([
      client.db().admin().ping(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500)),
    ]);
    return { ok: true, latencyMs: Date.now() - started };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "unknown" };
  }
}

async function _handler_GET() {
  const mongo = await pingMongo();
  const env = {
    yunwu: Boolean(process.env.YUNWU_API_KEY),
    fal: Boolean(process.env.FAL_KEY || process.env.FAL_API_KEY),
    omnivoice: Boolean(process.env.OMNIVOICE_BASE_URL),
    mongoConfigured: Boolean(process.env.MONGODB_URI),
    auth: Boolean(process.env.AUTH_SECRET),
  };
  const ok = mongo.ok && env.auth && env.mongoConfigured;
  return NextResponse.json(
    {
      ok,
      timestamp: new Date().toISOString(),
      mongo,
      env,
    },
    { status: ok ? 200 : 503 },
  );
}

export const GET = rateLimitedRoute("health", _handler_GET);
