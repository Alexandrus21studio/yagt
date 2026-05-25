"use client";

import { GitBranch, Plus, Search } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/repo/yagt/core"
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
            <span style={{ fontWeight: 600 }}>Explore</span>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            Browse repositories and discover projects.
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
