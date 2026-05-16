import { FuturisticHero } from "@/components/FuturisticHero";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <a
        href="#main-content"
        className="skip-link focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <FuturisticHero />
    </main>
  );
}
