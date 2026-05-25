"use client";

import { Search, Bell, Plus } from "lucide-react";
import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";

export function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-3 bg-base-200 border-b border-base-300 gap-4">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="text-xl font-bold text-base-content no-underline flex items-center gap-2"
        >
          <span className="inline-block w-7 h-7 bg-primary rounded-md text-center leading-7 text-white text-sm">
            Y
          </span>
          yagt
        </Link>
      </div>

      <div className="flex-1 max-w-[500px] relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/70"
        />
        <input
          type="text"
          placeholder="Search repositories, issues, PRs..."
          className="input input-bordered input-sm w-full pl-9 bg-base-100"
        />
      </div>

      <div className="flex items-center gap-3">
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button className="btn btn-sm btn-primary flex items-center gap-1.5">
              Sign in with GitHub
            </button>
          </SignInButton>
        </Show>
        <Show when="signed-in">
          <button className="btn btn-sm btn-ghost flex items-center gap-1.5">
            <Plus size={16} />
            <span className="hidden sm:inline">New</span>
          </button>
          <button className="btn btn-sm btn-ghost btn-square relative">
            <Bell size={18} />
            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-primary rounded-full" />
          </button>
          <UserButton />
        </Show>
      </div>
    </header>
  );
}
