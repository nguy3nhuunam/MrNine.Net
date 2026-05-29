import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  return (
    <div className="min-h-screen bg-[#090807] text-[#f4eadc]">
      <header className="border-b border-white/8 bg-[#0c0a08]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-mono text-xs uppercase tracking-[0.32em] text-[#ef4444]">
              MrNine
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <NavLink href="/dashboard" label="Tổng quan" />
              <NavLink href="/dashboard/api-keys" label="API keys" />
              <NavLink href="/dashboard/usage" label="Usage" />
              <NavLink href="/dashboard/billing" label="Nạp tiền" />
              <NavLink href="/dashboard/playground" label="Playground" />
              <NavLink href="/dashboard/webhooks" label="Webhooks" />
            </nav>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-[#9a9087]">{session.user.email}</span>
            <form
              action={async () => {
                "use server";
                const { signOut } = await import("@/auth");
                await signOut({ redirectTo: "/" });
              }}
            >
              <button className="rounded-md border border-white/10 px-2.5 py-1 font-mono uppercase tracking-[0.16em] text-[#9a9087] hover:border-white/30">
                Thoát
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="text-[#c8bdaf] transition hover:text-[#f4eadc]">
      {label}
    </Link>
  );
}
