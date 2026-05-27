import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Analytics · Admin · MrNine",
  robots: { index: false, follow: false },
};

export default async function AdminAnalyticsPage() {
  const session = await auth();
  const email = session?.user?.email ?? null;
  const ok = await isAdminEmail(email);
  if (!ok) redirect("/?login=1&from=/admin/analytics");

  return (
    <div className="min-h-screen bg-[#0b0a08] px-4 py-6 text-[#f4eadc] sm:px-8 sm:py-10">
      <header className="mx-auto mb-6 flex max-w-6xl items-center justify-between">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-amber-400/80">
            MrNine / Admin
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Analytics</h1>
        </div>
        <Link
          href="/admin"
          className="rounded-md border border-white/12 px-3 py-1.5 text-[0.78rem] text-white/80 transition hover:bg-white/[0.05]"
        >
          ← Admin home
        </Link>
      </header>
      <AnalyticsDashboard />
    </div>
  );
}
