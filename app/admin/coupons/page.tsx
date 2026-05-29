import { desc } from "drizzle-orm";

import { db } from "@/lib/pg/db";
import { coupons } from "@/lib/pg/schema";
import { CouponAdmin } from "@/components/admin/CouponAdmin";

export const metadata = { title: "Coupon · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CouponsAdminPage() {
  const rows = await db
    .select({
      id: coupons.id,
      code: coupons.code,
      kind: coupons.kind,
      valueMicroUsd: coupons.valueMicroUsd,
      maxRedemptions: coupons.maxRedemptions,
      redeemedCount: coupons.redeemedCount,
      expiresAt: coupons.expiresAt,
      note: coupons.note,
      createdAt: coupons.createdAt,
    })
    .from(coupons)
    .orderBy(desc(coupons.createdAt))
    .limit(200);

  // Drizzle returns Date, JSON.stringify down to string in client component.
  const initial = rows.map((r) => ({
    ...r,
    valueMicroUsd: Number(r.valueMicroUsd),
    expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
    createdAt: r.createdAt ? r.createdAt.toISOString() : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Coupon</h1>
        <p className="mt-1 text-sm text-[#9a9087]">
          Tạo mã giảm giá cho user redeem ở /dashboard/billing.
        </p>
      </div>
      <CouponAdmin initial={initial} />
    </div>
  );
}
