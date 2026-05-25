"use client";

import { useParams } from "next/navigation";
import { GitPullRequest } from "lucide-react";

export default function PullsPage() {
  const params = useParams();
  const owner = params.owner as string;
  const name = params.name as string;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 600 }}>
          {owner}/{name} — Pull Requests
        </h1>
        <button>New pull request</button>
      </div>

      <div
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <GitPullRequest size={32} style={{ color: "var(--text-secondary)", marginBottom: "12px" }} />
        <p style={{ color: "var(--text-secondary)" }}>No pull requests found.</p>
      </div>
    </div>
  );
}
