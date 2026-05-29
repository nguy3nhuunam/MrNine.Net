import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/pg/db";
import { apiKeys } from "@/lib/pg/schema";
import { generateApiKey } from "@/lib/pg/api-keys";
import { requireUser } from "@/lib/pg/session";
import { ApiKeysPanel } from "@/components/dashboard/ApiKeysPanel";

export const metadata = { title: "API keys · MrNine" };
export const dynamic = "force-dynamic";

async function createKey(formData: FormData) {
  "use server";
  const user = await requireUser();
  const name = String(formData.get("name") ?? "default").trim().slice(0, 120) || "default";
  const { plaintext, hash, prefix } = generateApiKey();
  await db.insert(apiKeys).values({
    userId: user.id,
    name,
    keyHash: hash,
    keyPrefix: prefix,
  });
  revalidatePath("/dashboard/api-keys");
  // Stash plaintext in cookie cho 60s để client show 1 lần.
  const { cookies } = await import("next/headers");
  (await cookies()).set("mrnine_new_key", plaintext, {
    httpOnly: false,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60,
    path: "/dashboard/api-keys",
  });
}

async function disableKey(formData: FormData) {
  "use server";
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db
    .update(apiKeys)
    .set({ status: "disabled" })
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, user.id)));
  revalidatePath("/dashboard/api-keys");
}

async function revokeKey(formData: FormData) {
  "use server";
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db
    .update(apiKeys)
    .set({ status: "revoked" })
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, user.id)));
  revalidatePath("/dashboard/api-keys");
}

export default async function ApiKeysPage() {
  const user = await requireUser();
  const list = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      status: apiKeys.status,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
      allowedModels: apiKeys.allowedModels,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, user.id))
    .orderBy(desc(apiKeys.createdAt));

  const { cookies } = await import("next/headers");
  const newKey = (await cookies()).get("mrnine_new_key")?.value ?? null;

  return (
    <ApiKeysPanel
      keys={list.map((k) => ({
        ...k,
        createdAt: k.createdAt?.toISOString() ?? null,
        lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      }))}
      newKeyPlaintext={newKey}
      createKey={createKey}
      disableKey={disableKey}
      revokeKey={revokeKey}
    />
  );
}
