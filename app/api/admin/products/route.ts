import { NextResponse } from "next/server";
import { deleteProduct, listProducts, requireAdmin, upsertProduct } from "@/lib/admin-config";
import { safeJsonRoute } from "@/lib/safe-json-route";
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
  return NextResponse.json({ ok: true, item });
}

async function _DELETE(request: Request) {
  const blocked = await requireAdmin();
  if (blocked) return blocked;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await deleteProduct(id);
  return NextResponse.json({ ok: true });
}

export const GET = safeJsonRoute(_GET);
export const POST = safeJsonRoute(_POST);
export const DELETE = safeJsonRoute(_DELETE);
