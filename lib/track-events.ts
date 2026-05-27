// Event taxonomy. The whole analytics pipeline (client → /api/track →
// Mongo `events` collection → /admin/analytics) reads from this single
// source of truth. Add new event names here, not in handlers.
//
// Keep names short, lowercase, snake_case. Props is intentionally loose —
// the dashboard aggregates only well-known fields per event type.

export const EVENT_NAMES = [
  "page_view",
  "module_open",
  "ai_call_start",
  "ai_call_success",
  "ai_call_error",
  "cta_click",
  "signin_prompt",
  "signin_complete",
  "onboarding_step",
  "onboarding_done",
  "client_error",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export type TrackEvent = {
  event: EventName;
  // Per-event props. Keys we aggregate on, by event:
  //   module_open      : { module: string }
  //   ai_call_*        : { route: string, kind?: string, durationMs?: number, status?: number }
  //   cta_click        : { id: string, ctx?: string }
  //   signin_*         : { provider?: "google" | "discord" }
  //   onboarding_step  : { step: number }
  //   client_error     : { message: string, digest?: string, url?: string }
  //   page_view        : { path: string, ref?: string }
  props?: Record<string, string | number | boolean | null | undefined>;
  // Caller-provided session id for funnel analysis. The server stamps the
  // user id (if any) and IP-derived bucket separately.
  sid?: string;
  ts?: number;
};

export function isKnownEvent(value: unknown): value is EventName {
  return typeof value === "string" && (EVENT_NAMES as readonly string[]).includes(value);
}

// Server-side doc shape (what we write to Mongo).
export type EventDoc = {
  _id?: unknown;
  event: EventName;
  props?: Record<string, unknown>;
  sid?: string;
  userId?: string | null;
  ip?: string | null;
  ua?: string | null;
  ts: Date;
  // 90-day TTL: server sets `expiresAt = ts + 90d` and Mongo prunes via index.
  expiresAt: Date;
};

export const EVENT_TTL_DAYS = 90;
