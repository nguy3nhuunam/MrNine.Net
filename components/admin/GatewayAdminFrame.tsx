/**
 * Admin layout chỉ áp dụng cho route con (users, provider-keys, model-map,
 * transactions, logs). Trang `/admin` gốc giữ AdminShell hiện tại.
 *
 * Đây là layout "wrapper" cho mỗi sub-route — Next App Router xếp chồng
 * layout, nên ta export 1 component và mỗi sub-route dùng route-level
 * `layout.tsx` import từ đây.
 */
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-config";

export async function GatewayAdminFrame({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const email = session?.user?.email ?? null;
  const ok = await isAdminEmail(email);
  if (!ok) redirect("/?login=1&from=/admin");

  return (
    <div className="min-h-screen bg-[#090807] text-[#f4eadc]">
      <header className="border-b border-white/8 bg-[#0c0a08]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-mono text-xs uppercase tracking-[0.32em] text-[#ef4444]">
              MrNine · Admin
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <NavLink href="/admin/users" label="Users" />
              <NavLink href="/admin/provider-keys" label="Provider keys" />
              <NavLink href="/admin/model-map" label="Model map" />
              <NavLink href="/admin/transactions" label="Giao dịch" />
              <NavLink href="/admin/gmail" label="Gmail" />
              <NavLink href="/admin/logs" label="Logs" />
              <NavLink href="/admin" label="Site" />
            </nav>
          </div>
          <span className="text-xs text-[#9a9087]">{email}</span>
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
