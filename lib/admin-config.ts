import { NextResponse } from "next/server";
import { auth } from "@/auth";
import clientPromise from "@/lib/mongodb";
import type { StoreItem } from "@/lib/ai-store-catalog";
import { aiStoreCatalog } from "@/lib/ai-store-catalog";

export type SiteConfig = {
  hero: { vi: string[]; en: string[] };
  modules: Record<string, { hidden?: boolean; comingSoon?: boolean; detailVi?: string; detailEn?: string }>;
  themes: Record<string, { hidden?: boolean }>;
  storeOverrides?: { hidden?: string[]; products?: StoreItem[] };
  stats?: { visitsByModule?: Record<string, number>; askCount24h?: number };
};

const DEFAULT_CONFIG: SiteConfig = {
  hero: { vi: [], en: [] },
  modules: {},
  themes: {},
  storeOverrides: {},
  stats: {},
};

const CACHE_TTL_MS = 30_000;
let cached: { value: SiteConfig; expires: number } | null = null;

function adminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "mrnine.net@gmail.com";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function isAdminEmail(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  return adminEmails().has(email.toLowerCase());
}

export async function requireAdmin() {
  const session = await auth();
  const email = session?.user?.email ?? null;
  if (!(await isAdminEmail(email))) {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }
  return null;
}

export async function getSiteConfig(force = false): Promise<SiteConfig> {
  if (!force && cached && cached.expires > Date.now()) return cached.value;
  let value = DEFAULT_CONFIG;
  try {
    if (clientPromise) {
      const client = await clientPromise;
      const doc = await client.db().collection("site_config").findOne({ _id: "singleton" as unknown as never });
      if (doc) {
        const { _id: _ignored, ...rest } = doc as { _id: unknown } & Partial<SiteConfig>;
        void _ignored;
        value = { ...DEFAULT_CONFIG, ...(rest as Partial<SiteConfig>) };
      }
    }
  } catch {
    // ignore — return defaults
  }
  cached = { value, expires: Date.now() + CACHE_TTL_MS };
  return value;
}

export async function saveSiteConfig(patch: Partial<SiteConfig>): Promise<SiteConfig> {
  const current = await getSiteConfig(true);
  const next: SiteConfig = { ...current, ...patch };
  if (clientPromise) {
    const client = await clientPromise;
    await client.db().collection("site_config").updateOne(
      { _id: "singleton" as unknown as never },
      { $set: next },
      { upsert: true },
    );
  }
  cached = { value: next, expires: Date.now() + CACHE_TTL_MS };
  return next;
}

export async function listProducts(): Promise<StoreItem[]> {
  try {
    if (clientPromise) {
      const client = await clientPromise;
      const docs = await client.db().collection("store_products").find({}).sort({ priceVnd: 1 }).toArray();
      if (docs.length) {
        return docs.map((d) => {
          const { _id: _ignored, ...rest } = d;
          void _ignored;
          return rest as StoreItem;
        });
      }
    }
  } catch {
    // ignore
  }
  return aiStoreCatalog as StoreItem[];
}

export async function upsertProduct(item: StoreItem): Promise<void> {
  if (!clientPromise) throw new Error("Mongo not configured");
  const client = await clientPromise;
  await client.db().collection("store_products").updateOne(
    { id: item.id },
    { $set: item },
    { upsert: true },
  );
}

export async function deleteProduct(id: string): Promise<void> {
  if (!clientPromise) throw new Error("Mongo not configured");
  const client = await clientPromise;
  await client.db().collection("store_products").deleteOne({ id });
}

export async function trackVisit(module: string): Promise<void> {
  if (!clientPromise || !module) return;
  try {
    const client = await clientPromise;
    await client.db().collection("admin_stats").updateOne(
      { _id: "visits" as unknown as never },
      { $inc: { [`byModule.${module}`]: 1, total: 1 } },
      { upsert: true },
    );
  } catch {
    // ignore
  }
}

export async function getStats(): Promise<{ byModule: Record<string, number>; total: number }> {
  try {
    if (clientPromise) {
      const client = await clientPromise;
      const doc = await client.db().collection("admin_stats").findOne({ _id: "visits" as unknown as never });
      if (doc) {
        const d = doc as { byModule?: Record<string, number>; total?: number };
        return { byModule: d.byModule ?? {}, total: d.total ?? 0 };
      }
    }
  } catch {
    // ignore
  }
  return { byModule: {}, total: 0 };
}
