"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Send, Bot, User, Sparkles } from "lucide-react";

const mockMessages = [
  {
    role: "assistant",
    content:
      "Hello! I'm the yagt AI assistant. I can help you understand this repository, review code, suggest improvements, or generate documentation. What would you like to know?",
  },
  {
    role: "user",
    content: "Summarize the architecture of this repo",
  },
  {
    role: "assistant",
    content:
      "This repository follows a layered architecture:\n\n1. **Core Engine** (`src/engine/`) - Handles Git object storage, ref management, and packfile operations.\n2. **AI Adapter** (`src/ai/`) - Abstracts ML model interactions for semantic diffing and merge resolution.\n3. **Storage Layer** (`src/storage/`) - Pluggable backends (filesystem, S3, memory).\n4. **CLI Frontend** (`src/cli/`) - User-facing commands built on the core engine.\n\nThe separation allows swapping AI providers or storage backends without touching the core.",
  },
];

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
        {mockMessages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: msg.role === "assistant" ? "var(--accent)" : "var(--success)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {msg.role === "assistant" ? <Bot size={14} color="#fff" /> : <User size={14} color="#fff" />}
            </div>
            <div
              style={{
                background: msg.role === "assistant" ? "var(--bg-tertiary)" : "var(--bg-primary)",
                padding: "12px 16px",
                borderRadius: "8px",
                fontSize: "14px",
                lineHeight: 1.6,
                maxWidth: "80%",
                whiteSpace: "pre-wrap",
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <input
          type="text"
          placeholder="Ask the AI about this repository..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{ flex: 1 }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setInput("");
            }
          }}
        />
        <button
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "8px 16px",
          }}
          onClick={() => setInput("")}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
