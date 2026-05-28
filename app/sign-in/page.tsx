import Link from "next/link";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/SignInForm";

export const metadata = { title: "Đăng nhập · MrNine" };

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#090807] px-4 py-16 text-[#f4eadc]">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0c0a08] p-8 shadow-[0_24px_60px_-30px_rgba(239,68,68,0.45)]">
        <h1 className="font-mono text-xs uppercase tracking-[0.32em] text-[#9a9087]">mrnine.net</h1>
        <h2 className="mt-2 text-3xl font-semibold">Đăng nhập</h2>
        <p className="mt-2 text-sm text-[#9a9087]">Vào dashboard để quản lý API key, balance, usage.</p>

        <div className="mt-6">
          <SignInForm />
        </div>

        <p className="mt-6 text-center text-sm text-[#9a9087]">
          Chưa có tài khoản?{" "}
          <Link href="/sign-up" className="text-[#ef4444] hover:underline">
            Đăng ký miễn phí
          </Link>
        </p>
      </div>
    </main>
  );
}
