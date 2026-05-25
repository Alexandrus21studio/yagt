"use client";

import { useParams } from "next/navigation";
import { GitBranch, Star, GitFork, AlertCircle, FileText, Folder, GitCommit, Clock } from "lucide-react";
import { AIPanel } from "@/components/AIPanel";
import Link from "next/link";

const mockRepo = {
  description: "AI-powered Git backend with intelligent merge resolution and semantic diffing.",
  language: "Rust",
  stars: 1240,
  forks: 89,
  issues: 12,
  updatedAt: "2 hours ago",
  aiSummary:
    "This repository implements a high-performance Git backend with AI-assisted merge resolution. Key features include semantic diffing, automated conflict resolution using transformer models, and a pluggable storage engine. The codebase is well-structured with clear separation between the core engine and AI adapters.",
  files: [
    { name: "src", type: "dir" },
    { name: "tests", type: "dir" },
    { name: "Cargo.toml", type: "file" },
    { name: "README.md", type: "file" },
    { name: "LICENSE", type: "file" },
    { name: ".gitignore", type: "file" },
  ],
  readme:
    "# yagt Core\n\nAI-powered Git backend with intelligent merge resolution.\n\n## Features\n- Semantic diffing\n- AI-assisted conflict resolution\n- Pluggable storage engine\n",
  commits: [
    { hash: "a1b2c3d", msg: "feat: add semantic diff engine", author: "alex", time: "2h ago" },
    { hash: "e4f5g6h", msg: "fix: resolve merge edge case", author: "alex", time: "5h ago" },
    { hash: "i7j8k9l", msg: "docs: update architecture", author: "alex", time: "1d ago" },
  ],
};

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
        <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>{mockRepo.description}</p>
      </div>

      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px" }}>
          <GitBranch size={14} /> main
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px" }}>
          <Star size={14} /> {mockRepo.stars}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px" }}>
          <GitFork size={14} /> {mockRepo.forks}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px" }}>
          <AlertCircle size={14} /> {mockRepo.issues} issues
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", color: "var(--text-secondary)" }}>
          <Clock size={14} /> {mockRepo.updatedAt}
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
              {mockRepo.files.map((f) => (
                <div
                  key={f.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 0",
                    borderBottom: "1px solid var(--border-color)",
                    fontSize: "14px",
                  }}
                >
                  {f.type === "dir" ? <Folder size={16} style={{ color: "var(--accent)" }} /> : <FileText size={16} style={{ color: "var(--text-secondary)" }} />}
                  <span>{f.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              padding: "16px",
            }}
          >
            <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>README.md</h3>
            <div style={{ fontSize: "14px", lineHeight: 1.6, color: "var(--text-secondary)" }}>
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{mockRepo.readme}</pre>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <AIPanel title="AI Repository Summary">
            <p style={{ fontSize: "13px", lineHeight: 1.6, color: "var(--text-secondary)" }}>{mockRepo.aiSummary}</p>
          </AIPanel>

          <div
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              padding: "16px",
            }}
          >
            <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>Recent Commits</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {mockRepo.commits.map((c) => (
                <div key={c.hash} style={{ fontSize: "13px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <GitCommit size={14} style={{ color: "var(--success)" }} />
                    <span style={{ color: "var(--accent)", fontFamily: "monospace" }}>{c.hash}</span>
                    <span style={{ color: "var(--text-secondary)" }}>{c.time}</span>
                  </div>
                  <div style={{ marginLeft: "20px", marginTop: "2px" }}>{c.msg}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
