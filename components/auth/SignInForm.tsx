"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

export function SignInForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const callbackUrl = sp.get("callbackUrl") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError("Sai email hoặc mật khẩu.");
        return;
      }
      router.replace(callbackUrl);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Input label="Email" type="email" value={email} onChange={setEmail} required autoFocus />
      <Input label="Mật khẩu" type="password" value={password} onChange={setPassword} required minLength={8} />
      {error ? <p className="text-sm text-[#ef4444]">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[#ef4444] px-4 py-3 font-mono text-xs uppercase tracking-[0.24em] text-[#090807] transition hover:bg-[#dc2626] disabled:opacity-60"
      >
        {pending ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>

      <div className="my-4 flex items-center gap-3 text-[0.6rem] uppercase tracking-[0.2em] text-[#5d544a]">
        <span className="h-px flex-1 bg-white/10" />
        <span>hoặc</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl })}
        className="w-full rounded-lg border border-white/10 bg-[#120c09] px-4 py-3 font-mono text-xs uppercase tracking-[0.24em] text-[#f4eadc] transition hover:border-white/30"
      >
        Tiếp tục với Google
      </button>
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
