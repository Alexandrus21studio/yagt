"use client";

import { Star, GitFork, AlertCircle } from "lucide-react";
import Link from "next/link";

interface RepoCardProps {
  owner: string;
  name: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  issues: number;
  updatedAt: string;
  aiSummary?: string;
}

const langClass: Record<string, string> = {
  TypeScript: "bg-blue-500",
  Rust: "bg-orange-300",
  Go: "bg-cyan-500",
  Python: "bg-blue-600",
  JavaScript: "bg-yellow-400",
};

export function RepoCard({
  owner,
  name,
  description,
  language,
  stars,
  forks,
  issues,
  updatedAt,
  aiSummary,
}: RepoCardProps) {
  return (
    <div className="card card-bordered card-compact bg-base-200 transition-colors hover:border-primary">
      <div className="card-body">
        <div className="flex items-center gap-2">
          <Link
            href={`/repo/${owner}/${name}`}
            className="text-base font-semibold"
          >
            {owner}/{name}
          </Link>
          <span className="badge badge-outline badge-sm">Public</span>
        </div>

        <p className="text-sm text-base-content/70 leading-relaxed">
          {description}
        </p>

        {aiSummary && (
          <div className="bg-base-300 rounded-md px-3 py-2 text-sm text-base-content/70 border-l-[3px] border-primary">
            <strong className="text-primary">AI Summary:</strong> {aiSummary}
          </div>
        )}

        <div className="flex items-center gap-4 mt-1 text-[13px] text-base-content/70">
          {language && (
            <span className="flex items-center gap-1">
              <span
                className={`w-3 h-3 rounded-full inline-block ${
                  langClass[language] || "bg-base-content/70"
                }`}
              />
              {language}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Star size={14} />
            {stars.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <GitFork size={14} />
            {forks.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <AlertCircle size={14} />
            {issues}
          </span>
          <span className="ml-auto">{updatedAt}</span>
        </div>
      </div>
    </div>
  );
}
