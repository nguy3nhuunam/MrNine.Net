import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { deleteProduct, listProducts, recordAudit, requireAdmin, upsertProduct } from "@/lib/admin-config";
import { rateLimitedRoute } from "@/lib/safe-json-route";
import type { StoreItem } from "@/lib/ai-store-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function _GET() {
  const blocked = await requireAdmin();
  if (blocked) return blocked;
  const items = await listProducts();
  return NextResponse.json({ items });
}

async function _POST(request: Request) {
  const blocked = await requireAdmin();
  if (blocked) return blocked;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const item = body as StoreItem;
  if (!item.id || !item.product || !item.brand || typeof item.priceVnd !== "number") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  await upsertProduct(item);
  const session = await auth();
  await recordAudit("product:upsert", session?.user?.email ?? "unknown", { id: item.id, product: item.product });
  return NextResponse.json({ ok: true, item });
}

async function _DELETE(request: Request) {
  const blocked = await requireAdmin();
  if (blocked) return blocked;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await deleteProduct(id);
  const session = await auth();
  await recordAudit("product:delete", session?.user?.email ?? "unknown", { id });
  return NextResponse.json({ ok: true });
}

export const GET = rateLimitedRoute("admin-products", _GET);
export const POST = rateLimitedRoute("admin-products", _POST);
export const DELETE = rateLimitedRoute("admin-products", _DELETE);
