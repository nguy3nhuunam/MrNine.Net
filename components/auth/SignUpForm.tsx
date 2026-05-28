"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export function SignUpForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName: name }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        const msg =
          j.error === "email_taken"
            ? "Email đã đăng ký."
            : j.error === "password_too_short"
              ? "Mật khẩu cần ít nhất 8 ký tự."
              : j.error === "invalid_email"
                ? "Email không hợp lệ."
                : "Đăng ký thất bại, thử lại.";
        setError(msg);
        return;
      }
      const sess = await signIn("credentials", { email, password, redirect: false });
      if (sess?.error) {
        setError("Đăng ký thành công nhưng đăng nhập tự động thất bại. Hãy đăng nhập tay.");
        router.replace("/sign-in");
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Input label="Tên hiển thị (optional)" type="text" value={name} onChange={setName} />
      <Input label="Email" type="email" value={email} onChange={setEmail} required autoFocus />
      <Input label="Mật khẩu (≥ 8 ký tự)" type="password" value={password} onChange={setPassword} required minLength={8} />
      {error ? <p className="text-sm text-[#ef4444]">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[#ef4444] px-4 py-3 font-mono text-xs uppercase tracking-[0.24em] text-[#090807] transition hover:bg-[#dc2626] disabled:opacity-60"
      >
        {pending ? "Đang tạo tài khoản..." : "Đăng ký + nhận $0.5 credit"}
      </button>

      <p className="text-[0.65rem] leading-relaxed text-[#5d544a]">
        Đăng ký nghĩa là bạn đồng ý với{" "}
        <a href="/legal/terms" className="underline">
          Điều khoản
        </a>{" "}
        và{" "}
        <a href="/legal/privacy" className="underline">
          Chính sách bảo mật
        </a>
        .
      </p>
    </form>
  );
}

function Input({
  label,
  type,
  value,
  onChange,
  required,
  minLength,
  autoFocus,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#9a9087]">{label}</span>
      <input
        className="mt-1 block w-full rounded-md border border-[#2a251f] bg-[#090807] px-3 py-2.5 text-sm text-[#f4eadc] outline-none focus:border-[#ef4444]/60"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        autoFocus={autoFocus}
      />
    </label>
  );
}
