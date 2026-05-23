import { Suspense } from "react";
import { HomeCommandSurface } from "@/components/HomeCommandSurface";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeCommandSurface />
    </Suspense>
  );
}
