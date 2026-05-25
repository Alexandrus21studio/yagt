"use client";

import { useParams } from "next/navigation";
import { GitPullRequest, CheckCircle, AlertCircle, Clock, MessageSquare, Sparkles } from "lucide-react";
import Link from "next/link";

interface Pull {
  number: number;
  title: string;
  author: string;
  branch: string;
  status: "open" | "merged" | "draft";
  aiReview: string;
  aiStatus: "approved" | "changes_requested" | "needs_review";
  comments: number;
  checks: string;
  time: string;
}

const pulls: Pull[] = [
  {
    number: 142,
    title: "Dark mode fixes and accessibility improvements",
    author: "eve",
    branch: "eve/dark-mode-a11y",
    status: "open",
    aiReview:
      "No accessibility regressions detected. Color contrast ratios pass WCAG AA. Recommend adding focus-visible styles for keyboard navigation.",
    aiStatus: "approved",
    comments: 3,
    checks: "4 / 4 passing",
    time: "1h ago",
  },
  {
    number: 141,
    title: "Introduce semantic diff engine for Rust modules",
    author: "frank",
    branch: "frank/semantic-diff",
    status: "open",
    aiReview:
      "Complex change affecting 14 files. AI detected one potential panic path in src/diff/engine.rs:89. Suggest adding a bounds check before indexing.",
    aiStatus: "changes_requested",
    comments: 8,
    checks: "3 / 4 passing",
    time: "5h ago",
  },
  {
    number: 138,
    title: "Refactor auth middleware to use Tower layers",
    author: "grace",
    branch: "grace/tower-auth",
    status: "open",
    aiReview:
      "Clean refactor with good test coverage. All existing auth tests pass. No breaking API changes identified.",
    aiStatus: "approved",
    comments: 2,
    checks: "5 / 5 passing",
    time: "1d ago",
  },
  {
    number: 135,
    title: "Bump dependencies for Q2 security patches",
    author: "hank",
    branch: "hank/deps-q2",
    status: "merged",
    aiReview:
      "Dependency bump reviewed automatically. No known vulnerabilities in updated crates. Changelog entries present.",
    aiStatus: "approved",
    comments: 1,
    checks: "5 / 5 passing",
    time: "2d ago",
  },
];

const statusIcon = {
  open: <GitPullRequest size={18} style={{ color: "var(--success)" }} />,
  merged: <CheckCircle size={18} style={{ color: "var(--accent)" }} />,
  draft: <AlertCircle size={18} style={{ color: "var(--text-secondary)" }} />,
};

const aiBadge = {
  approved: { label: "AI Approved", color: "var(--success)", bg: "rgba(63,185,80,0.15)" },
  changes_requested: { label: "AI Changes Requested", color: "var(--danger)", bg: "rgba(248,81,73,0.15)" },
  needs_review: { label: "AI Review Pending", color: "var(--warning)", bg: "rgba(210,153,34,0.15)" },
};

export default function PullsPage() {
  const params = useParams<{ owner: string; name: string }>();
  const owner = params.owner;
  const name = params.name;

  const openCount = pulls.filter((p) => p.status === "open" || p.status === "draft").length;
  const closedCount = pulls.filter((p) => p.status === "merged").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "20px", fontWeight: 700 }}>
            {owner}/{name}
          </span>
        </div>
        <button>New pull request</button>
      </div>

      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border-color)" }}>
        {[
          { label: "Code", href: "" },
          { label: "Issues", href: "/issues" },
          { label: "Pull requests", href: "/pulls" },
          { label: "AI Assistant", href: "/ai" },
        ].map((tab) => (
          <Link
            key={tab.label}
            href={`/repo/${owner}/${name}${tab.href}`}
            style={{
              padding: "8px 12px",
              fontSize: "14px",
              fontWeight: 500,
              borderBottom:
                tab.label === "Pull requests"
                  ? "2px solid var(--accent)"
                  : "2px solid transparent",
              color:
                tab.label === "Pull requests"
                  ? "var(--text-primary)"
                  : "var(--text-secondary)",
              textDecoration: "none",
            }}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          gap: "12px",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          padding: "12px 16px",
          fontSize: "14px",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>
          <GitPullRequest size={16} style={{ color: "var(--success)" }} />
          {openCount} Open
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)" }}>
          <CheckCircle size={16} />
          {closedCount} Merged
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {pulls.map((pr) => {
          const badge = aiBadge[pr.aiStatus];
          return (
            <div
              key={pr.number}
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {statusIcon[pr.status]}
                <Link
                  href="#"
                  style={{
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {pr.title}
                </Link>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    background: badge.bg,
                    color: badge.color,
                  }}
                >
                  {badge.label}
                </span>
              </div>

              <div
                style={{
                  background: "var(--bg-tertiary)",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  borderLeft: "3px solid var(--accent)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                }}
              >
                <Sparkles size={14} style={{ color: "var(--accent)", marginTop: "2px", flexShrink: 0 }} />
                {pr.aiReview}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  flexWrap: "wrap",
                }}
              >
                <span>#{pr.number}</span>
                <span>opened {pr.time} by {pr.author}</span>
                <span style={{ color: "var(--accent)" }}>{pr.branch}</span>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <MessageSquare size={12} />
                  {pr.comments}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Clock size={12} />
                  {pr.checks}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
