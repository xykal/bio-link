"use client";

import { useEffect } from "react";

// Injects Google Fonts <link> tags into <head> at runtime (client-side).
export default function FontLoader({ href }: { href: string }) {
  useEffect(() => {
    if (!href) return;
    const load = (rel: string, extra?: Record<string, string>) => {
      const id = `font-${rel}-${extra?.crossOrigin ? "x" : "n"}`;
      if (document.getElementById(id)) return;
      const link = document.createElement("link");
      link.id = id;
      link.rel = rel;
      if (extra?.crossOrigin) link.crossOrigin = "anonymous";
      if (rel === "stylesheet") link.href = href;
      else if (rel === "preconnect") link.href = extra?.href || "";
      document.head.appendChild(link);
    };
    load("preconnect", { href: "https://fonts.googleapis.com", crossOrigin: "anonymous" });
    load("preconnect", { href: "https://fonts.gstatic.com", crossOrigin: "anonymous" });
    load("stylesheet");
  }, [href]);

  return null;
}
