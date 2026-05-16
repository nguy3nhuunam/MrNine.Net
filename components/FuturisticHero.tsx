"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { HeroScene } from "@/components/HeroScene";
import { useMediaQuery } from "@/hooks/use-media-query";
import { aiModules } from "@/lib/module-data";

const DEFAULT_MODULE_ID = "chat-bot-ai";
const HOVER_CLEAR_DELAY_MS = 90;

export function FuturisticHero() {
  const isMobile = useMediaQuery("(max-width: 900px)");
  const hoverClearTimerRef = useRef<number | null>(null);
  const [selectedId, setSelectedId] = useState(() => {
    if (typeof window === "undefined") {
      return DEFAULT_MODULE_ID;
    }

    const hash = window.location.hash.replace("#", "");
    return aiModules.some((module) => module.id === hash) ? hash : DEFAULT_MODULE_ID;
  });
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    const nextHash = `#${selectedId}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, "", nextHash);
    }
  }, [selectedId]);

  useEffect(() => {
    return () => {
      if (hoverClearTimerRef.current !== null) {
        window.clearTimeout(hoverClearTimerRef.current);
      }
    };
  }, []);

  const activeModule = useMemo(() => {
    const activeId = hoveredId ?? selectedId;
    return aiModules.find((module) => module.id === activeId) ?? aiModules[0];
  }, [hoveredId, selectedId]);

  function handleHoverChange(id: string | null) {
    if (hoverClearTimerRef.current !== null) {
      window.clearTimeout(hoverClearTimerRef.current);
      hoverClearTimerRef.current = null;
    }

    if (id) {
      setHoveredId((current) => (current === id ? current : id));
      return;
    }

    hoverClearTimerRef.current = window.setTimeout(() => {
      hoverClearTimerRef.current = null;
      setHoveredId(null);
    }, HOVER_CLEAR_DELAY_MS);
  }

  function handleSelect(id: string) {
    if (hoverClearTimerRef.current !== null) {
      window.clearTimeout(hoverClearTimerRef.current);
      hoverClearTimerRef.current = null;
    }

    setHoveredId(null);
    setSelectedId(id);
  }

  return (
    <section
      id="main-content"
      aria-labelledby="home-title"
      className="relative h-screen overflow-hidden bg-background"
    >
      <div className="absolute inset-0">
        <HeroScene
          activeId={activeModule.id}
          hoveredId={hoveredId}
          isMobile={isMobile}
          onHoverChange={handleHoverChange}
          onSelect={handleSelect}
        />
      </div>

      <div className="sr-only">
        <h1 id="home-title">WebAI interactive module deck</h1>
        <p>
          Trang chủ là một bảng điều khiển 3D toàn màn hình. Chạm hoặc bấm trực tiếp
          vào từng nút lục giác để kích hoạt module tương ứng.
        </p>
      </div>
    </section>
  );
}
