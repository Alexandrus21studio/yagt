"use client";

import { RepoCard } from "@/components/RepoCard";
import { AIPanel } from "@/components/AIPanel";
import { GitBranch, Plus, Search, Activity } from "lucide-react";
import Link from "next/link";

const repos = [
  {
    owner: "yagt",
    name: "core",
    description:
      "Fast, AI-powered Git backend with intelligent merge resolution and semantic diffing.",
    language: "Rust",
    stars: 1240,
    forks: 89,
    issues: 12,
    updatedAt: "2 hours ago",
    aiSummary:
      "Core engine providing high-performance Git operations with integrated AI assistance for conflict resolution.",
  },
  {
    owner: "yagt",
    name: "web",
    description: "Next.js web interface for yagt with rich AI-powered features.",
    language: "TypeScript",
    stars: 856,
    forks: 45,
    issues: 7,
    updatedAt: "4 hours ago",
    aiSummary:
      "Modern React frontend offering repository browsing, AI chat, and code review automation.",
  },
  {
    owner: "yagt",
    name: "cli",
    description: "Command-line interface for yagt with smart commit suggestions.",
    language: "Go",
    stars: 643,
    forks: 32,
    issues: 5,
    updatedAt: "1 day ago",
    aiSummary:
      "Developer-friendly CLI that suggests commit messages and flags potential bugs before push.",
  },
];

const activities = [
  { action: "Pushed", target: "yagt/core", detail: "feat: ai-merge-v2", time: "10m ago" },
  { action: "Opened PR", target: "yagt/web", detail: "#142 Dark mode fixes", time: "1h ago" },
  { action: "Merged", target: "yagt/cli", detail: "#89 Performance improvements", time: "3h ago" },
  { action: "Issue created", target: "yagt/core", detail: "#201 Auth token expiry", time: "5h ago" },
];

export default function Dashboard() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h1 style={{ fontSize: "24px", fontWeight: 700 }}>Dashboard</h1>
        <div style={{ display: "flex", gap: "8px" }}>
          <button style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Plus size={16} />
            New repository
          </button>
          <button style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <GitBranch size={16} />
            Import
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "16px",
        }}
      >
        <AIPanel title="AI Daily Summary">
          <p style={{ color: "var(--text-secondary)" }}>
            Across your 12 watched repositories, there have been{" "}
            <strong style={{ color: "var(--text-primary)" }}>47 commits</strong>,{" "}
            <strong style={{ color: "var(--text-primary)" }}>8 PRs opened</strong>, and{" "}
            <strong style={{ color: "var(--text-primary)" }}>3 issues resolved</strong> in the last 24
            hours. The AI has automatically flagged 2 potential security regressions in
            yagt/core.
          </p>
        </AIPanel>

        <div
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            padding: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <Activity size={16} style={{ color: "var(--accent)" }} />
            <span style={{ fontSize: "14px", fontWeight: 600 }}>Recent Activity</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {activities.map((a, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "13px",
                }}
              >
                <span>
                  <span style={{ color: "var(--text-secondary)" }}>{a.action}</span>{" "}
                  <Link href={`/repo/${a.target.replace("/", "/")}`}>{a.target}</Link>{" "}
                  <span style={{ color: "var(--text-secondary)" }}>{a.detail}</span>
                </span>
                <span style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                  {a.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h2
          style={{
            fontSize: "18px",
            fontWeight: 600,
            marginBottom: "12px",
          }}
        >
          Top Repositories
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {repos.map((repo) => (
            <RepoCard key={`${repo.owner}/${repo.name}`} {...repo} />
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/repo/yagt/core/ai"
          style={{
            flex: 1,
            minWidth: "200px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            padding: "16px",
            textDecoration: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <Search size={18} style={{ color: "var(--accent)" }} />
            <span style={{ fontWeight: 600 }}>Ask AI</span>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            Ask questions about any repository and get instant, contextual answers.
          </p>
        </Link>
        <Link
          href="/repo/yagt/core/pulls"
          style={{
            flex: 1,
            minWidth: "200px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            padding: "16px",
            textDecoration: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <GitBranch size={18} style={{ color: "var(--success)" }} />
            <span style={{ fontWeight: 600 }}>Review PRs</span>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            AI-assisted code review with automatic severity detection.
          </p>
        </Link>
      </div>
    </div>
  );
}
