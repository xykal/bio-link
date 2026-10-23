"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type TabKey = "bio" | "project" | "shop";

// Pill switch antar halaman. Tiap tab punya URL sendiri (/ , /project , /shop)
// supaya bisa di-share, di-refresh, dan di-index Google — bukan cuma state React.
export default function TabNav({
  tabs,
  accent,
}: {
  tabs: { projects: boolean; shop: boolean };
  accent?: string;
}) {
  const pathname = usePathname() || "/";
  const current: TabKey = pathname.startsWith("/project")
    ? "project"
    : pathname.startsWith("/shop")
      ? "shop"
      : "bio";

  const items: { key: TabKey; href: string; label: string }[] = [
    { key: "bio", href: "/", label: "Bio" },
    ...(tabs.projects ? [{ key: "project" as TabKey, href: "/project", label: "Project" }] : []),
    ...(tabs.shop ? [{ key: "shop" as TabKey, href: "/shop", label: "Shop" }] : []),
  ];

  if (items.length <= 1) return null;

  return (
    <nav
      aria-label="Navigasi halaman"
      className="mx-auto mt-5 flex w-full max-w-xs items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] p-1"
      style={{ ["--tab-accent" as string]: accent || "#8b5cf6" }}
    >
      {items.map((item) => {
        const active = item.key === current;
        return (
          <Link
            key={item.key}
            prefetch={false}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex-1 rounded-full px-3 py-1.5 text-center text-[13px] font-semibold transition ${
              active ? "text-white shadow-sm" : "text-white/60 hover:text-white"
            }`}
            style={active ? { background: "var(--tab-accent)" } : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
