import { SmartRecapShell } from "@/components/SmartRecapShell";

const og = "/api/og?title=Smart%20Recap&subtitle=YouTube%20%C2%B7%20video%20%C2%B7%20PDF%20%C2%B7%20web&accent=lime";

export const metadata = {
  title: "Smart Recap — tóm tắt 1 phút",
  description: "Tóm tắt video YouTube, file PDF dài và bài web thành bullet và action items.",
  openGraph: {
    title: "Smart Recap — tóm tắt 1 phút",
    description: "Paste link / upload — nhận bullet và action items trong 1 phút.",
    images: [og],
  },
  twitter: { card: "summary_large_image", title: "Smart Recap", description: "1-minute recap of any link / upload.", images: [og] },
};

export default function SmartRecapPage() {
  return <SmartRecapShell />;
}
