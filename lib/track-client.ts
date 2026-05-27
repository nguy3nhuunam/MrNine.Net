"use client";

// Client helper: ship analytics events to /api/track without blocking UI.
// Uses sendBeacon (background, survives page-unload) when available, falls
// back to fetch with keepalive. Fire-and-forget; never await it.

import { EVENT_NAMES, type EventName, type TrackEvent } from "@/lib/track-events";

const SID_KEY = "mrnine-sid";

function getSid(): string {
  if (typeof window === "undefined") return "";
  try {
    let sid = window.sessionStorage.getItem(SID_KEY);
    if (!sid) {
      sid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      window.sessionStorage.setItem(SID_KEY, sid);
    }
    return sid;
  } catch {
    return "";
  }
}

export function trackEvent(
  event: EventName,
  props?: TrackEvent["props"],
): void {
  if (typeof window === "undefined") return;
  if (!(EVENT_NAMES as readonly string[]).includes(event)) return;

  const payload: TrackEvent = {
    event,
    props,
    sid: getSid(),
    ts: Date.now(),
  };

  try {
    const body = JSON.stringify(payload);
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      const ok = navigator.sendBeacon("/api/track", blob);
      if (ok) return;
    }
    // Fallback: fire-and-forget fetch with keepalive.
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Never let analytics break the page.
  }
}
