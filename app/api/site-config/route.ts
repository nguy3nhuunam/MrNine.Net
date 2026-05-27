import { NextResponse } from "next/server";
import { getSiteConfig, listProducts } from "@/lib/admin-config";
import { rateLimitedRoute } from "@/lib/safe-json-route";

export const runtime = "nodejs";
// rateLimitForRequest reads headers(), which forces dynamic rendering. Stay
// dynamic instead of `revalidate` so Next doesn't try to prerender at build.
export const dynamic = "force-dynamic";

async function _GET() {
  const [cfg, products] = await Promise.all([getSiteConfig(), listProducts()]);
  return NextResponse.json({
    hero: cfg.hero,
    modules: cfg.modules,
    themes: cfg.themes,
    products,
  });
}

export const GET = rateLimitedRoute("site-config", _GET);
