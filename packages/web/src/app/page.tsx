"use client";

import { GitBranch, Plus, Search } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <button className="btn btn-sm btn-primary flex items-center gap-1.5">
            <Plus size={16} />
            New repository
          </button>
          <button className="btn btn-sm btn-ghost flex items-center gap-1.5">
            <GitBranch size={16} />
            Import
          </button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Link
          href="/repo/yagt/core"
          className="card card-bordered card-compact bg-base-200 flex-1 min-w-[200px] no-underline hover:border-primary transition-colors"
        >
          <div className="card-body">
            <div className="flex items-center gap-2 mb-2">
              <Search size={18} className="text-primary" />
              <span className="font-semibold">Explore</span>
            </div>
            <p className="text-[13px] text-base-content/70">
              Browse repositories and discover projects.
            </p>
          </div>
        </Link>
        <Link
          href="/repo/yagt/core/pulls"
          className="card card-bordered card-compact bg-base-200 flex-1 min-w-[200px] no-underline hover:border-primary transition-colors"
        >
          <div className="card-body">
            <div className="flex items-center gap-2 mb-2">
              <GitBranch size={18} className="text-success" />
              <span className="font-semibold">Review PRs</span>
            </div>
            <p className="text-[13px] text-base-content/70">
              AI-assisted code review with automatic severity detection.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
