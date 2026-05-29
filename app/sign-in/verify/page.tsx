import Link from "next/link";

export const metadata = { title: "Kiểm tra email · MrNine" };

export default function VerifyRequestPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#090807] px-4 py-16 text-[#f4eadc]">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0c0a08] p-8 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#45a85d]/15 text-2xl">
          ✉
        </div>
        <h1 className="mt-4 text-2xl font-semibold">Kiểm tra email</h1>
        <p className="mt-2 text-sm text-[#9a9087]">
          Đã gửi link đăng nhập tới email của bạn. Mở mail và click vào nút "Đăng nhập".
        </p>
        <p className="mt-4 text-xs text-[#5d544a]">Link hết hạn sau 24 giờ.</p>
        <Link
          href="/sign-in"
          className="mt-6 inline-block font-mono text-xs uppercase tracking-wider text-[#ef4444]"
        >
          ← Về trang đăng nhập
        </Link>
      </div>
    </main>
  );
}
