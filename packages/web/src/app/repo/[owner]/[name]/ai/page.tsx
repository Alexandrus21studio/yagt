"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Send, Bot, Sparkles, User, Trash2, Code, FileText, Bug, Zap } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  { icon: Code,     text: "Explain the architecture of this repo" },
  { icon: FileText, text: "What are the main dependencies?" },
  { icon: Bug,      text: "What are the open issues about?" },
  { icon: Zap,      text: "How do I set up the development environment?" },
];

const REPO_TABS = [
  { label: "Code",          href: "" },
  { label: "Issues",        href: "/issues" },
  { label: "Pull requests", href: "/pulls" },
  { label: "AI Assistant",  href: "/ai" },
];

function AIChat({ owner, name }: { owner: string; name: string }) {
  const searchParams = useSearchParams();
  const issueNumber = searchParams.get("issue");

  const initialMessage = issueNumber
    ? `I'll help you with **issue #${issueNumber}** in \`${owner}/${name}\`. What would you like to know?`
    : `I'm the AI assistant for **${owner}/${name}**. I've read the README, recent commits, and repo metadata. Ask me anything.`;

  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: initialMessage },
  ]);
  const [input, setInput] = useState(
    issueNumber ? `Explain issue #${issueNumber} and suggest a fix` : ""
  );
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  }

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
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
      setMessages([...next, { role: "assistant", content: data.answer ?? data.error ?? "No response." }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Network error — please try again." }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] max-w-3xl mx-auto">

      {/* Top bar */}
      <div className="shrink-0 flex items-center gap-2 py-3 border-b border-base-300">
        <Sparkles size={15} className="text-primary shrink-0" />
        <span className="font-semibold text-sm">AI Assistant</span>
        <span className="text-base-content/30">·</span>
        <Link href={`/repo/${owner}/${name}`} className="text-primary text-sm font-mono no-underline hover:underline">
          {owner}/{name}
        </Link>
        <button
          onClick={() => setMessages([{ role: "assistant", content: initialMessage }])}
          className="btn btn-ghost btn-xs gap-1 text-base-content/50 hover:text-base-content ml-auto"
        >
          <Trash2 size={12} /> Clear
        </button>
      </div>

      {/* Repo tabs */}
      <div className="shrink-0 tabs tabs-bordered overflow-x-auto flex-nowrap border-b border-base-300">
        {REPO_TABS.map((t) => (
          <Link
            key={t.label}
            href={`/repo/${owner}/${name}${t.href}`}
            className={`tab whitespace-nowrap${t.label === "AI Assistant" ? " tab-active" : ""}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="flex flex-col gap-1 py-4 px-2">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex gap-3 px-2 py-1.5 rounded-xl ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${m.role === "assistant" ? "bg-primary/15" : "bg-base-300"}`}>
                {m.role === "assistant"
                  ? <Bot size={14} className="text-primary" />
                  : <User size={14} className="text-base-content/60" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-primary text-primary-content rounded-tr-sm"
                  : "bg-base-200 text-base-content rounded-tl-sm border border-base-300"
              }`}>
                {m.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none prose-p:my-1 prose-pre:my-2 prose-headings:my-2 prose-ul:my-1 prose-li:my-0.5">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  <span className="whitespace-pre-wrap">{m.content}</span>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 px-2 py-1.5">
              <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={14} className="text-primary" />
              </div>
              <div className="bg-base-200 border border-base-300 rounded-2xl rounded-tl-sm px-4 py-3">
                <span className="loading loading-dots loading-sm text-primary" />
              </div>
            </div>
          )}

          {/* Suggestions */}
          {messages.length === 1 && (
            <div className="flex flex-wrap gap-2 px-2 pt-2">
              {SUGGESTIONS.map(({ icon: Icon, text }) => (
                <button
                  key={text}
                  onClick={() => sendMessage(text)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-base-300 bg-base-200 hover:bg-base-300 text-sm text-base-content/70 hover:text-base-content transition-colors"
                >
                  <Icon size={12} className="text-primary shrink-0" />
                  <span>{text}</span>
                </button>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-base-300 pt-3 pb-2">
        <div className="flex items-end gap-2 bg-base-200 border border-base-300 rounded-2xl px-4 py-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
          <textarea
            ref={inputRef}
            rows={1}
            placeholder={`Ask anything about ${name}… (Enter to send, Shift+Enter for newline)`}
            value={input}
            onChange={autoResize}
            onKeyDown={handleKeyDown}
            disabled={loading}
            className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-base-content placeholder:text-base-content/40 max-h-40 py-1"
            style={{ minHeight: "24px" }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="btn btn-primary btn-sm rounded-xl px-3 shrink-0 mb-0.5 disabled:opacity-30"
          >
            <Send size={14} />
          </button>
        </div>
        <p className="text-center text-[11px] text-base-content/30 mt-1.5">
          Powered by NVIDIA NIMs · meta/llama-3.3-70b-instruct
        </p>
      </div>
    </div>
  );
}

export default function AIPage() {
  const params = useParams<{ owner: string; name: string }>();
  const { owner, name } = params;
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><span className="loading loading-spinner loading-md text-primary" /></div>}>
      <AIChat owner={owner} name={name} />
    </Suspense>
  );
}
