import { CalculatorsShell } from "@/components/CalculatorsShell";

const og = "/api/og?title=Calculators&subtitle=thu%E1%BA%BF%20%C2%B7%20vay%20%C2%B7%20BMI%20%C2%B7%20t%E1%BB%89%20gi%C3%A1&accent=red";

export const metadata = {
  title: "Calculators VN — thuế TNCN, vay, BMI, đổi tiền",
  description:
    "Bộ máy tính tiếng Việt: thuế TNCN 2026 (gross↔net), EMI vay nhà/xe, BMI, tip, đổi đơn vị, đổi tiền theo tỉ giá realtime.",
  openGraph: {
    title: "Calculators VN",
    description: "Thuế TNCN, EMI vay, BMI, tip, đổi đơn vị, đổi tiền realtime.",
    images: [og],
  },
  twitter: { card: "summary_large_image", title: "Calculators VN", description: "Thuế TNCN, vay, BMI, đổi tiền.", images: [og] },
};

export const dynamic = "force-dynamic";

export default function CalculatorsPage() {
  return <CalculatorsShell />;
}
