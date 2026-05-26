"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Send, Bot, Sparkles, User, Trash2 } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Explain the architecture of this repo",
  "What are the main dependencies?",
  "How do I set up the development environment?",
  "What are the open issues about?",
];

export default function AIPage() {
  const params = useParams<{ owner: string; name: string }>();
  const searchParams = useSearchParams();
  const { owner, name } = params;
  const issueNumber = searchParams.get("issue");

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: issueNumber
        ? `I'll help you with **issue #${issueNumber}** in \`${owner}/${name}\`. What would you like to know?`
        : `Hi! I'm the AI assistant for **${owner}/${name}**. I've read the README, recent commits, and repo metadata. Ask me anything.`,
    },
  ]);
  const [input, setInput] = useState(
    issueNumber ? `Explain issue #${issueNumber} and suggest a fix` : ""
  );
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");
    const next: Message[] = [...messages, { role: "user", content }];
    setMessages(next);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, owner, repo: name }),
      });
      const data = await res.json();
      setMessages([...next, {
        role: "assistant",
        content: data.answer ?? data.error ?? "No response.",
      }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Network error — please try again." }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  return (
    <div className="flex flex-col gap-3 max-w-3xl h-[calc(100dvh-7.5rem)]">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <Sparkles size={16} className="text-primary shrink-0" />
        <h1 className="text-base font-semibold">AI Assistant</h1>
        <span className="text-base-content/30">·</span>
        <Link href={`/repo/${owner}/${name}`} className="text-primary text-sm">{owner}/{name}</Link>
        <button
          onClick={() => setMessages([{ role: "assistant", content: `Chat cleared. Ask me anything about **${owner}/${name}**.` }])}
          className="btn btn-ghost btn-xs ml-auto gap-1"
          title="Clear chat"
        >
          <Trash2 size={12} /> Clear
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-bordered overflow-x-auto flex-nowrap gap-0 shrink-0">
        {[
          { label: "Code", href: "" },
          { label: "Issues", href: "/issues" },
          { label: "Pull requests", href: "/pulls" },
          { label: "AI Assistant", href: "/ai" },
        ].map((t) => (
          <Link key={t.label} href={`/repo/${owner}/${name}${t.href}`}
            className={`tab whitespace-nowrap${t.label === "AI Assistant" ? " tab-active" : ""}`}>
            {t.label}
          </Link>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto bg-base-200 border border-base-300 rounded-xl p-3 sm:p-4 flex flex-col gap-3 min-h-0">
        {messages.map((m, i) => (
          <div key={i} className={`chat ${m.role === "user" ? "chat-end" : "chat-start"}`}>
            <div className="chat-image avatar">
              <div className="w-7 h-7 rounded-full bg-base-300 flex items-center justify-center shrink-0">
                {m.role === "assistant"
                  ? <Bot size={14} className="text-primary" />
                  : <User size={14} className="text-base-content/50" />}
              </div>
            </div>
            <div className={`chat-bubble text-sm max-w-[85%] ${
              m.role === "user"
                ? "bg-primary text-primary-content"
                : "bg-base-300 text-base-content"
            }`}>
              {m.role === "assistant" ? (
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>
              ) : m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat chat-start">
            <div className="chat-image avatar">
              <div className="w-7 h-7 rounded-full bg-base-300 flex items-center justify-center">
                <Bot size={14} className="text-primary" />
              </div>
            </div>
            <div className="chat-bubble bg-base-300">
              <span className="loading loading-dots loading-sm" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions (shown when only greeting) */}
      {messages.length === 1 && (
        <div className="flex gap-2 flex-wrap">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="btn btn-xs btn-ghost border border-base-300 text-base-content/60 hover:text-base-content normal-case font-normal"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 shrink-0">
        <input
          ref={inputRef}
          type="text"
          placeholder={`Ask anything about ${name}...`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          className="input input-bordered input-sm flex-1 bg-base-100"
          disabled={loading}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="btn btn-sm btn-primary px-3"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
