"use client";

import { LayoutDashboard, GitBranch, Bot, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: GitBranch, label: "Repositories", href: "/repo/yagt/core" },
  { icon: Bot, label: "AI Assistant", href: "/repo/yagt/core/ai" },
  { icon: Settings, label: "Settings", href: "#" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: "240px",
        minWidth: "240px",
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border-color)",
        padding: "16px 12px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            href={item.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "8px 12px",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: 500,
              color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
              background: isActive ? "var(--bg-tertiary)" : "transparent",
              textDecoration: "none",
              transition: "background 0.15s",
            }}
          >
            <Icon size={18} />
            {item.label}
          </Link>
        );
      })}
    </aside>
  );
}
