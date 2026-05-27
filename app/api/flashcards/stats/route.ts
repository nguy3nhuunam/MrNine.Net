import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { getSessionUserId } from "@/lib/user-state";
import { cardsCol, reviewsCol } from "@/lib/flashcards/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const blocked = await requireAuth();
  if (blocked) return blocked;
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ stats: null });

  const cards = await cardsCol();
  const reviews = await reviewsCol();
  if (!cards || !reviews) return NextResponse.json({ stats: null });

  const now = Date.now();
  const dayMs = 86_400_000;

  // Card distribution by state.
  const stateAgg = await cards
    .aggregate([
      { $match: { userId } },
      { $group: { _id: "$state", count: { $sum: 1 } } },
    ])
    .toArray();
  const states: Record<string, number> = {};
  for (const r of stateAgg) states[r._id as string] = r.count as number;

  // Last 30 days review heatmap + retention.
  const since = now - 30 * dayMs;
  const recent = await reviews
    .find({ userId, reviewedAt: { $gte: since } })
    .toArray();

  const heatmap: Record<string, number> = {};
  let success = 0;
  let total = 0;
  for (const r of recent) {
    const d = new Date(r.reviewedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    heatmap[key] = (heatmap[key] ?? 0) + 1;
    total++;
    if (r.grade > 1) success++;
  }
  const retention = total === 0 ? 0 : success / total;

  // Forecast next 7 days.
  const forecast: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const start = now + i * dayMs;
    const end = start + dayMs;
    const c = await cards.countDocuments({
      userId,
      state: "review",
      nextDueAt: { $gte: start, $lt: end },
    });
    const d = new Date(start);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    forecast[key] = c;
  }

  // Interval buckets for review-state cards.
  const intervals = await cards
    .aggregate([
      { $match: { userId, state: "review" } },
      {
        $bucket: {
          groupBy: { $divide: [{ $subtract: ["$nextDueAt", now] }, dayMs] },
          boundaries: [0, 1, 7, 30, 90, 365, 1825, 100000],
          default: "other",
          output: { count: { $sum: 1 } },
        },
      },
    ])
    .toArray();

  return NextResponse.json({
    stats: {
      states,
      retention,
      reviewsLast30: total,
      heatmap,
      forecast,
      intervalBuckets: intervals,
    },
  });
}
