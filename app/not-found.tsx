"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center text-[#e8dfd4]">
      <div className="font-display text-5xl font-black tracking-[-0.08em] text-[#f4eadc]">
        Mr<span className="text-[#ef4444]">Nine</span>
      </div>
      <p className="mt-4 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-[#9a9087]">
        404 / route not found
      </p>
      <h1 className="mt-3 font-display text-3xl font-black tracking-[-0.04em]">Không thấy trang.</h1>
      <p className="mt-2 max-w-md text-[0.85rem] text-[#b5ab9f]">
        Đường dẫn này chưa tồn tại hoặc đã bị di chuyển. Thử về trang chủ hoặc dùng search.
      </p>
      <div className="mt-6 flex gap-2">
        <Link
          href="/"
          className="rounded-md bg-[#ef4444] px-4 py-2 text-sm font-bold text-[#090807] hover:bg-[#ff5b55]"
        >
          Về trang chủ
        </Link>
        <Link
          href="/?q="
          className="rounded-md border border-white/15 px-4 py-2 text-sm font-bold text-[#f4eadc] hover:bg-white/[0.05]"
        >
          Tìm kiếm
        </Link>
      </div>
    </main>
  );
}
