"use client";

import { Sparkles } from "lucide-react";

interface AIPanelProps {
  title: string;
  children: React.ReactNode;
  loading?: boolean;
}

export function AIPanel({ title, children, loading }: AIPanelProps) {
  return (
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
          alignItems: "center",
          gap: "8px",
          padding: "12px 16px",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--bg-tertiary)",
        }}
      >
        <Sparkles size={16} style={{ color: "var(--accent)" }} />
        <span style={{ fontSize: "14px", fontWeight: 600 }}>{title}</span>
        {loading && (
          <span
            style={{
              marginLeft: "auto",
              fontSize: "12px",
              color: "var(--accent)",
              animation: "pulse 1.5s infinite",
            }}
          >
            Generating...
          </span>
        )}
      </div>
      <div style={{ padding: "16px", fontSize: "14px", lineHeight: 1.6 }}>
        {children}
      </div>
    </div>
  );
}
