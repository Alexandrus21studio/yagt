"use client";

import { useParams } from "next/navigation";
import { AlertCircle } from "lucide-react";

export default function IssuesPage() {
  const params = useParams();
  const owner = params.owner as string;
  const name = params.name as string;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 600 }}>
          {owner}/{name} — Issues
        </h1>
        <button>New issue</button>
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
        <AlertCircle size={32} style={{ color: "var(--text-secondary)", marginBottom: "12px" }} />
        <p style={{ color: "var(--text-secondary)" }}>No issues found.</p>
      </div>
    </div>
  );
}
