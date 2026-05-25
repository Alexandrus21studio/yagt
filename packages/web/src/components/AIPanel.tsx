"use client";

import { Sparkles } from "lucide-react";

interface AIPanelProps {
  title: string;
  children: React.ReactNode;
  loading?: boolean;
}

export function AIPanel({ title, children, loading }: AIPanelProps) {
  return (
    <div className="card card-bordered card-compact bg-base-200 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-base-300 bg-base-300">
        <Sparkles size={16} className="text-primary" />
        <span className="text-sm font-semibold">{title}</span>
        {loading && (
          <span className="ml-auto text-xs text-primary animate-pulse">
            Generating...
          </span>
        )}
      </div>
      <div className="card-body text-sm leading-relaxed">{children}</div>
    </div>
  );
}
