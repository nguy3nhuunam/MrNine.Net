import { Suspense } from "react";
import { AIPlaygroundShell } from "@/components/AIPlaygroundShell";

export const metadata = {
  title: "AI Playground · MrNine",
  description: "Tạo ảnh và video bằng các model mới nhất của FAL.AI ngay trong MrNine.",
};

export const dynamic = "force-dynamic";

export default function AIPlaygroundPage() {
  return (
    <Suspense fallback={null}>
      <AIPlaygroundShell />
    </Suspense>
  );
}
