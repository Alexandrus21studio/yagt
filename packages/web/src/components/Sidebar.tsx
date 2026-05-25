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
    <aside className="w-60 min-w-[240px] bg-base-200 border-r border-base-300 py-4 px-3 flex flex-col gap-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium no-underline transition-colors ${
              isActive
                ? "text-base-content bg-base-300"
                : "text-base-content/70 bg-transparent hover:bg-base-300"
            }`}
          >
            <Icon size={18} />
            {item.label}
          </Link>
        );
      })}
    </aside>
  );
}
