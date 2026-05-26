import { NextResponse } from "next/server";
import { getSiteConfig, listProducts } from "@/lib/admin-config";
import { safeJsonRoute } from "@/lib/safe-json-route";

export const runtime = "nodejs";
export const revalidate = 30;

async function _GET() {
  const [cfg, products] = await Promise.all([getSiteConfig(), listProducts()]);
  return NextResponse.json({
    hero: cfg.hero,
    modules: cfg.modules,
    themes: cfg.themes,
    products,
  });
}

export const GET = safeJsonRoute(_GET);
