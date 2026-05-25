"use client";

import { useParams } from "next/navigation";
import { AlertCircle, CheckCircle, Clock, Tag, Sparkles } from "lucide-react";
import Link from "next/link";

interface Issue {
  number: number;
  title: string;
  author: string;
  labels: string[];
  comments: number;
  time: string;
  severity: "critical" | "high" | "medium" | "low";
  aiSummary: string;
  status: "open" | "closed";
}

const issues: Issue[] = [
  {
    number: 201,
    title: "Auth token expiry edge case causes 500 errors",
    author: "alice",
    labels: ["bug", "auth"],
    comments: 4,
    time: "2h ago",
    severity: "critical",
    aiSummary:
      "The token refresh logic fails when the clock skew exceeds 5s. Recommend using NTP-synced timestamps and adding a 30s leeway buffer.",
    status: "open",
  },
  {
    number: 198,
    title: "Memory leak in packfile parser during large clones",
    author: "bob",
    labels: ["bug", "performance"],
    comments: 12,
    time: "1d ago",
    severity: "high",
    aiSummary:
      "Detected unbounded buffer growth in packfile decoder. Affected code path: src/pack/decode.rs:142. Suggest capping buffer at 1GB and streaming large objects.",
    status: "open",
  },
  {
    number: 195,
    title: "Add support for shallow clones over SSH",
    author: "carol",
    labels: ["feature", "ssh"],
    comments: 3,
    time: "3d ago",
    severity: "medium",
    aiSummary:
      "Feature request aligned with Git protocol v2 spec. Estimated implementation effort: 2-3 days. No breaking changes expected.",
    status: "open",
  },
  {
    number: 190,
    title: "Update README with new benchmark numbers",
    author: "dave",
    labels: ["docs"],
    comments: 1,
    time: "5d ago",
    severity: "low",
    aiSummary:
      "Documentation-only change. AI suggests including flamegraphs and linking to CI benchmark dashboard.",
    status: "closed",
  },
];

const severityConfig = {
  critical: { color: "var(--danger)", bg: "rgba(248,81,73,0.15)" },
  high: { color: "var(--warning)", bg: "rgba(210,153,34,0.15)" },
  medium: { color: "var(--accent)", bg: "rgba(88,166,255,0.15)" },
  low: { color: "var(--success)", bg: "rgba(63,185,80,0.15)" },
};

export default function IssuesPage() {
  const params = useParams<{ owner: string; name: string }>();
  const owner = params.owner;
  const name = params.name;

  const openCount = issues.filter((i) => i.status === "open").length;
  const closedCount = issues.filter((i) => i.status === "closed").length;

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
        <button>New issue</button>
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
                tab.label === "Issues"
                  ? "2px solid var(--accent)"
                  : "2px solid transparent",
              color:
                tab.label === "Issues"
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
          <AlertCircle size={16} style={{ color: "var(--success)" }} />
          {openCount} Open
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)" }}>
          <CheckCircle size={16} />
          {closedCount} Closed
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {issues.map((issue) => {
          const sev = severityConfig[issue.severity];
          return (
            <div
              key={issue.number}
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
                {issue.status === "open" ? (
                  <AlertCircle size={18} style={{ color: "var(--success)" }} />
                ) : (
                  <CheckCircle size={18} style={{ color: "var(--accent)" }} />
                )}
                <Link
                  href="#"
                  style={{
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {issue.title}
                </Link>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    background: sev.bg,
                    color: sev.color,
                  }}
                >
                  {issue.severity}
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
                {issue.aiSummary}
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
                <span>#{issue.number}</span>
                <span>opened {issue.time} by {issue.author}</span>
                <div style={{ display: "flex", gap: "6px" }}>
                  {issue.labels.map((label) => (
                    <span
                      key={label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        background: "var(--bg-tertiary)",
                        border: "1px solid var(--border-color)",
                        fontSize: "12px",
                      }}
                    >
                      <Tag size={10} />
                      {label}
                    </span>
                  ))}
                </div>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Clock size={12} />
                  {issue.comments} comments
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
