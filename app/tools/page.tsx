import { ToolsShell } from "@/components/ToolsShell";

const og = "/api/og?title=Tools&subtitle=JSON%20%C2%B7%20regex%20%C2%B7%20JWT%20%C2%B7%20base64&accent=cyan";

export const metadata = {
  title: "Tools — JSON · regex · base64 · JWT · timestamp",
  description:
    "Hộp công cụ dev: format JSON, test regex, encode/decode base64, decode JWT, hash MD5/SHA, color picker, timestamp converter. Chạy hoàn toàn trên trình duyệt.",
  openGraph: {
    title: "Tools — Dev toolkit",
    description: "JSON formatter, regex tester, base64, JWT decoder, hash, color picker, timestamp.",
    images: [og],
  },
  twitter: { card: "summary_large_image", title: "Tools — Dev toolkit", description: "JSON · regex · base64 · JWT · hash.", images: [og] },
};

export const dynamic = "force-dynamic";

export default function ToolsPage() {
  return <ToolsShell />;
}
