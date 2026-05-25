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
  const langColor: Record<string, string> = {
    TypeScript: "#3178c6",
    Rust: "#dea584",
    Go: "#00add8",
    Python: "#3572A5",
    JavaScript: "#f1e05a",
  };

  return (
    <div
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-color)",
        borderRadius: "8px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        transition: "border-color 0.2s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Link
          href={`/repo/${owner}/${name}`}
          style={{ fontSize: "16px", fontWeight: 600 }}
        >
          {owner}/{name}
        </Link>
        <span
          style={{
            fontSize: "12px",
            padding: "2px 8px",
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
            color: "var(--text-secondary)",
          }}
        >
          Public
        </span>
      </div>

      <p
        style={{
          fontSize: "14px",
          color: "var(--text-secondary)",
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>

      {aiSummary && (
        <div
          style={{
            background: "var(--bg-tertiary)",
            borderRadius: "6px",
            padding: "8px 12px",
            fontSize: "13px",
            color: "var(--text-secondary)",
            borderLeft: "3px solid var(--accent)",
          }}
        >
          <strong style={{ color: "var(--accent)" }}>AI Summary:</strong>{" "}
          {aiSummary}
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginTop: "4px",
          fontSize: "13px",
          color: "var(--text-secondary)",
        }}
      >
        {language && (
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: langColor[language] || "var(--text-secondary)",
                display: "inline-block",
              }}
            />
            {language}
          </span>
        )}
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Star size={14} />
          {stars.toLocaleString()}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <GitFork size={14} />
          {forks.toLocaleString()}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <AlertCircle size={14} />
          {issues}
        </span>
        <span style={{ marginLeft: "auto" }}>{updatedAt}</span>
      </div>
    </div>
  );
}
