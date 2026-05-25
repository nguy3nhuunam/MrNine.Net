"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") return;
    const id = window.setTimeout(() => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => null);
    }, 2000);
    return () => window.clearTimeout(id);
  }, []);
  return null;
}
