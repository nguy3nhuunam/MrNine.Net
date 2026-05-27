import { Suspense } from "react";
import { HomeCommandSurface } from "@/components/HomeCommandSurface";
import { OnboardingOverlay } from "@/components/OnboardingOverlay";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeCommandSurface />
      <OnboardingOverlay />
    </Suspense>
  );
}
