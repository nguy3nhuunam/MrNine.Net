import { requireUser } from "@/lib/pg/session";
import { DigestToggle } from "@/components/dashboard/DigestToggle";
import { TelegramLinkPanel } from "@/components/dashboard/TelegramLinkPanel";
import { TwoFactorPanel } from "@/components/dashboard/TwoFactorPanel";

export const metadata = { title: "Settings · MrNine" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const me = await requireUser();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-[#9a9087]">Tuỳ chỉnh thông báo và preferences.</p>
      </div>

      <section className="rounded-xl border border-white/8 bg-[#0c0a08] p-4">
        <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.24em] text-[#9a9087]">
          Email notifications
        </h2>
        <div className="mt-4">
          <DigestToggle initial={me.digestEnabled} />
        </div>
        <p className="mt-3 text-xs text-[#5d544a]">
          Báo cáo gồm: số request 24h, chi phí, model dùng nhiều nhất, số dư hiện tại. Chỉ gửi nếu có hoạt động.
        </p>
      </section>

      <section className="rounded-xl border border-white/8 bg-[#0c0a08] p-4">
        <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.24em] text-[#9a9087]">
          Telegram bot
        </h2>
        <p className="mt-2 text-xs text-[#5d544a]">
          Gõ <code className="text-[#dff8e4]">/balance</code> hoặc <code className="text-[#dff8e4]">/usage</code> trên Telegram để xem nhanh.
        </p>
        <div className="mt-4">
          <TelegramLinkPanel linked={me.telegramChatId !== null} />
        </div>
      </section>

      <section className="rounded-xl border border-white/8 bg-[#0c0a08] p-4">
        <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.24em] text-[#9a9087]">
          Two-factor authentication
        </h2>
        <p className="mt-2 text-xs text-[#5d544a]">
          Yêu cầu 6-digit TOTP code khi đăng nhập bằng email + password. OAuth (Google/Discord/Magic-link) không bị ảnh hưởng.
        </p>
        <div className="mt-4">
          <TwoFactorPanel enabled={me.totpEnabled} />
        </div>
      </section>
    </div>
  );
}

