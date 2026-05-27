import { NextResponse } from "next/server";
import { trackVisit } from "@/lib/admin-config";
import { rateLimitedRoute } from "@/lib/safe-json-route";
import { getCollection, getSessionUserId } from "@/lib/user-state";
import { isKnownEvent, EVENT_TTL_DAYS, type EventDoc, type EventName } from "@/lib/track-events";
import { getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ClientErrorDoc = {
  _id?: unknown;
  message: string;
  digest: string | null;
  url: string | null;
  ua: string | null;
  ts: Date;
};

let eventsIndexEnsured = false;
async function ensureEventsIndex() {
  if (eventsIndexEnsured) return;
  const col = await getCollection<EventDoc>("events");
  if (!col) return;
  try {
    await Promise.all([
      col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      col.createIndex({ ts: -1 }),
      col.createIndex({ event: 1, ts: -1 }),
    ]);
  } catch {
    // ignore — index may already exist with different options
  }
  eventsIndexEnsured = true;
}

async function _POST(request: Request) {
  const body = await request.json().catch(() => null);
  const event = (body as { event?: string } | null)?.event;

  // Multi-event taxonomy path.
  if (typeof event === "string" && isKnownEvent(event)) {
    const col = await getCollection<EventDoc>("events");
    if (col) {
      await ensureEventsIndex();
      const userId = await getSessionUserId();
      const ip = await getClientIp();
      const ts = new Date();
      const expiresAt = new Date(ts.getTime() + EVENT_TTL_DAYS * 24 * 60 * 60 * 1000);
      const props = ((body as { props?: unknown } | null)?.props ?? null) as
        | Record<string, unknown>
        | null;
      const sid = ((body as { sid?: unknown } | null)?.sid as string | undefined) ?? undefined;

      await col.insertOne({
        event: event as EventName,
        props: props ?? undefined,
        sid,
        userId: userId ?? null,
        ip: ip ?? null,
        ua: request.headers.get("user-agent")?.slice(0, 240) ?? null,
        ts,
        expiresAt,
      });

      // Mirror module_open into the legacy admin_stats counter so the existing
      // admin dashboard keeps working without a migration.
      if (event === "module_open") {
        const moduleName = typeof props?.module === "string" ? props.module : null;
        if (moduleName) await trackVisit(moduleName);
      }

      // Legacy client_error collection — keep writing here too, for the
      // existing global-error reporter which reads it in /admin.
      if (event === "client_error") {
        const errCol = await getCollection<ClientErrorDoc>("client_errors");
        if (errCol) {
          await errCol.insertOne({
            message: String(props?.message ?? "").slice(0, 500),
            digest: ((props?.digest as string | undefined) ?? null) || null,
            url: ((props?.url as string | undefined) ?? null) || null,
            ua: request.headers.get("user-agent")?.slice(0, 240) ?? null,
            ts,
          });
        }
      }
    }
    return NextResponse.json({ ok: true });
  }

  // Legacy path — { event: "client_error", message, digest, url } shape kept
  // for global-error.tsx until it migrates to the new helper.
  if (event === "client_error") {
    const message = String((body as { message?: unknown } | null)?.message ?? "").slice(0, 500);
    if (!message) return NextResponse.json({ ok: false }, { status: 400 });
    const col = await getCollection<ClientErrorDoc>("client_errors");
    if (col) {
      await col.insertOne({
        message,
        digest: ((body as { digest?: unknown } | null)?.digest as string | null) ?? null,
        url: ((body as { url?: unknown } | null)?.url as string | null) ?? null,
        ua: request.headers.get("user-agent")?.slice(0, 240) ?? null,
        ts: new Date(),
      });
    }
    return NextResponse.json({ ok: true });
  }

  // Legacy module-visit path — { module: "story-writer" } shape.
  const moduleName = (body as { module?: string } | null)?.module;
  if (!moduleName || typeof moduleName !== "string" || moduleName.length > 64) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  await trackVisit(moduleName);
  return NextResponse.json({ ok: true });
}

export const POST = rateLimitedRoute("track", _POST);
