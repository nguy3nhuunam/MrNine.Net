// Admin analytics aggregation. Reads `events` collection over a 7-day
// window by default and returns a small JSON suitable for a dashboard
// without leaking PII.
//
// Shape:
// {
//   range: { from, to, days },
//   dau: [{ day: "2026-05-21", users: 12 }, ...],
//   topModules: [{ module: "story-writer", opens: 42 }, ...],
//   topErrors: [{ message: "...", count: 3 }, ...],
//   funnel: { opens, callStarts, callSuccesses, callErrors },
//   eventCounts: { event_name: count }
// }

import { NextResponse } from "next/server";
import { rateLimitedRoute } from "@/lib/safe-json-route";
import { requireAdmin } from "@/lib/admin-config";
import { getCollection } from "@/lib/user-state";
import type { EventDoc } from "@/lib/track-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Range = { from: Date; to: Date; days: number };

function parseRange(url: URL): Range {
  const days = Math.max(1, Math.min(30, Number(url.searchParams.get("days") ?? "7")));
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from, to, days };
}

async function _GET(request: Request) {
  const blocked = await requireAdmin();
  if (blocked) return blocked;

  const url = new URL(request.url);
  const range = parseRange(url);

  const col = await getCollection<EventDoc>("events");
  if (!col) {
    return NextResponse.json({
      range,
      dau: [],
      topModules: [],
      topErrors: [],
      funnel: { opens: 0, callStarts: 0, callSuccesses: 0, callErrors: 0 },
      eventCounts: {},
      empty: true,
    });
  }

  const baseMatch = { ts: { $gte: range.from, $lte: range.to } };

  const [dauRaw, topModulesRaw, topErrorsRaw, funnelRaw, eventCountsRaw] = await Promise.all([
    col
      .aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: {
              day: { $dateToString: { format: "%Y-%m-%d", date: "$ts" } },
              actor: { $ifNull: ["$userId", "$ip"] },
            },
          },
        },
        { $group: { _id: "$_id.day", users: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ])
      .toArray(),
    col
      .aggregate([
        { $match: { ...baseMatch, event: "module_open" } },
        { $group: { _id: "$props.module", opens: { $sum: 1 } } },
        { $sort: { opens: -1 } },
        { $limit: 12 },
      ])
      .toArray(),
    col
      .aggregate([
        { $match: { ...baseMatch, event: "client_error" } },
        { $group: { _id: "$props.message", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])
      .toArray(),
    col
      .aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: null,
            opens: { $sum: { $cond: [{ $eq: ["$event", "module_open"] }, 1, 0] } },
            callStarts: { $sum: { $cond: [{ $eq: ["$event", "ai_call_start"] }, 1, 0] } },
            callSuccesses: { $sum: { $cond: [{ $eq: ["$event", "ai_call_success"] }, 1, 0] } },
            callErrors: { $sum: { $cond: [{ $eq: ["$event", "ai_call_error"] }, 1, 0] } },
          },
        },
      ])
      .toArray(),
    col
      .aggregate([
        { $match: baseMatch },
        { $group: { _id: "$event", count: { $sum: 1 } } },
      ])
      .toArray(),
  ]);

  const dau = dauRaw.map((d) => ({ day: String(d._id), users: Number(d.users) }));
  const topModules = topModulesRaw
    .filter((d) => d._id)
    .map((d) => ({ module: String(d._id), opens: Number(d.opens) }));
  const topErrors = topErrorsRaw
    .filter((d) => d._id)
    .map((d) => ({ message: String(d._id).slice(0, 200), count: Number(d.count) }));
  const funnel = (funnelRaw[0] ?? {}) as Record<string, number>;
  const eventCounts = Object.fromEntries(eventCountsRaw.map((d) => [String(d._id), Number(d.count)]));

  return NextResponse.json({
    range,
    dau,
    topModules,
    topErrors,
    funnel: {
      opens: Number(funnel.opens ?? 0),
      callStarts: Number(funnel.callStarts ?? 0),
      callSuccesses: Number(funnel.callSuccesses ?? 0),
      callErrors: Number(funnel.callErrors ?? 0),
    },
    eventCounts,
  });
}

export const GET = rateLimitedRoute("admin-analytics", _GET);
