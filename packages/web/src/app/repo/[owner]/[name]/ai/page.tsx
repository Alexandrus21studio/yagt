"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Send, Bot, User, Sparkles } from "lucide-react";

export default function AIPage() {
  const params = useParams();
  const owner = params.owner as string;
  const name = params.name as string;
  const [input, setInput] = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", gap: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Sparkles size={20} style={{ color: "var(--accent)" }} />
        <h1 style={{ fontSize: "20px", fontWeight: 600 }}>
          AI Assistant — {owner}/{name}
        </h1>
      </div>

      <div
        style={{
          flex: 1,
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          padding: "16px",
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Bot size={14} color="#fff" />
          </div>
          <div
            style={{
              background: "var(--bg-tertiary)",
              padding: "12px 16px",
              borderRadius: "8px",
              fontSize: "14px",
              lineHeight: 1.6,
              maxWidth: "80%",
            }}
          >
            Hello! I'm the yagt AI assistant. Ask me anything about this repository.
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <input
          type="text"
          placeholder="Ask the AI about this repository..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{ flex: 1 }}
        />
        <button style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 16px" }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
