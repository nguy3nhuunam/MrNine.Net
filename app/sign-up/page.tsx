import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { SignUpForm } from "@/components/auth/SignUpForm";

export const metadata = { title: "Đăng ký · MrNine" };

export default async function SignUpPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#090807] px-4 py-16 text-[#f4eadc]">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0c0a08] p-8 shadow-[0_24px_60px_-30px_rgba(239,68,68,0.45)]">
        <h1 className="font-mono text-xs uppercase tracking-[0.32em] text-[#9a9087]">mrnine.net</h1>
        <h2 className="mt-2 text-3xl font-semibold">Đăng ký</h2>
        <p className="mt-2 text-sm text-[#9a9087]">
          Tài khoản mới được tặng <span className="text-[#dff8e4]">$0.5 free credit</span> để test API.
        </p>

        <div className="mt-6">
          <SignUpForm />
        </div>

        <p className="mt-6 text-center text-sm text-[#9a9087]">
          Đã có tài khoản?{" "}
          <Link href="/sign-in" className="text-[#ef4444] hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </main>
  );
}
