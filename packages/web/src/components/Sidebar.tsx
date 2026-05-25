"use client";

import { LayoutDashboard, GitBranch, Bot, Settings, GitPullRequest, AlertCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: GitBranch, label: "Repositories", href: "/explore" },
  { icon: GitPullRequest, label: "Pull Requests", href: "/pulls" },
  { icon: AlertCircle, label: "Issues", href: "/issues" },
  { icon: Bot, label: "AI Assistant", href: "/ai" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <aside className="w-60 min-h-full bg-base-200 border-r border-base-300 py-3 px-2 flex flex-col gap-0.5">
      {user && (
        <div className="flex items-center gap-2.5 px-3 py-2 mb-2">
          {user.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.imageUrl} alt={user.username ?? ""} className="w-6 h-6 rounded-full" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs text-white font-bold">
              {(user.username ?? user.firstName ?? "?")[0].toUpperCase()}
            </div>
          )}
          <span className="text-sm font-medium text-base-content truncate">
            {user.username ?? user.firstName ?? "Account"}
          </span>
        </div>
      )}

      {navItems.map((item) => {
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <label key={item.label} htmlFor="main-drawer">
            <Link
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium no-underline transition-colors cursor-pointer ${
                isActive
                  ? "text-base-content bg-base-300 font-semibold"
                  : "text-base-content/60 hover:text-base-content hover:bg-base-300"
              }`}
            >
              <Icon size={16} className={isActive ? "text-primary" : ""} />
              {item.label}
            </Link>
          </label>
        );
      })}
    </aside>
  );
}
