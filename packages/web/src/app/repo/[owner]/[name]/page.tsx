"use client";

import { useParams } from "next/navigation";
import { GitBranch, Star, GitFork, AlertCircle, FileText, Folder, GitCommit, Clock } from "lucide-react";
import Link from "next/link";

export default function RepoPage() {
  const params = useParams();
  const owner = params.owner as string;
  const name = params.name as string;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 600 }}>
            {owner} / {name}
          </h1>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: "12px",
              border: "1px solid var(--border-color)",
              fontSize: "12px",
              color: "var(--text-secondary)",
            }}
          >
            Public
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px" }}>
          <GitBranch size={14} /> main
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px" }}>
          <Star size={14} /> 0
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px" }}>
          <GitFork size={14} /> 0
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px" }}>
          <AlertCircle size={14} /> 0 issues
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "16px",
                padding: "12px 16px",
                borderBottom: "1px solid var(--border-color)",
                fontSize: "14px",
              }}
            >
              <Link href={`/repo/${owner}/${name}`} style={{ color: "var(--text-primary)", fontWeight: 600, textDecoration: "none" }}>
                Code
              </Link>
              <Link href={`/repo/${owner}/${name}/issues`} style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
                Issues
              </Link>
              <Link href={`/repo/${owner}/${name}/pulls`} style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
                Pull requests
              </Link>
              <Link href={`/repo/${owner}/${name}/ai`} style={{ color: "var(--accent)", textDecoration: "none" }}>
                AI Assistant
              </Link>
            </div>

            <div style={{ padding: "16px" }}>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>No files to display.</p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              padding: "16px",
            }}
          >
            <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>Recent Commits</h3>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>No commits yet.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
