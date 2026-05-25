"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, Sparkles, Trash2, User, Search, GitBranch } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface SearchResult {
  id: number;
  full_name: string;
  owner: { login: string };
  name: string;
  description: string | null;
}

const STARTER_SUGGESTIONS = [
  "Explain the architecture of this repo",
  "What are the main dependencies?",
  "How do I contribute to this project?",
  "What bugs or issues exist?",
];

export default function GlobalAIPage() {
  const [repoInput, setRepoInput] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<{ owner: string; name: string } | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm your AI assistant. Search for a GitHub repository above, then ask me anything about it." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!repoInput.trim() || repoInput.includes("/")) {
      setSearchResults([]);
      setShowSearch(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/github/search/repositories?q=${encodeURIComponent(repoInput)}&per_page=6`);
        const data = await res.json();
        if (Array.isArray(data.items)) {
          setSearchResults(data.items);
          setShowSearch(true);
        }
      } catch { /* ignore */ }
    }, 350);
  }, [repoInput]);

  function selectRepo(r: SearchResult) {
    setSelectedRepo({ owner: r.owner.login, name: r.name });
    setRepoInput(r.full_name);
    setShowSearch(false);
    setMessages([
      { role: "assistant", content: `I'll help you with **${r.full_name}**. I've read the README, recent commits, and repo metadata. What would you like to know?` },
    ]);
  }

  function handleRepoInputChange(val: string) {
    setRepoInput(val);
    // Handle owner/repo format typed directly
    const parts = val.split("/");
    if (parts.length === 2 && parts[0] && parts[1]) {
      setSelectedRepo({ owner: parts[0], name: parts[1] });
    } else if (!val.includes("/")) {
      setSelectedRepo(null);
    }
  }

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    if (!selectedRepo) {
      setMessages((prev) => [...prev, { role: "user", content }, { role: "assistant", content: "Please select a repository first using the search box above." }]);
      setInput("");
      return;
    }
    setInput("");
    const next: Message[] = [...messages, { role: "user", content }];
    setMessages(next);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, owner: selectedRepo.owner, repo: selectedRepo.name }),
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
    <div className="flex flex-col gap-3 max-w-3xl" style={{ height: "calc(100dvh - 112px)" }}>
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <Sparkles size={16} className="text-primary shrink-0" />
        <h1 className="text-base font-semibold">AI Assistant</h1>
        {selectedRepo && (
          <>
            <span className="text-base-content/30">·</span>
            <Link href={`/repo/${selectedRepo.owner}/${selectedRepo.name}`} className="text-primary text-sm">
              {selectedRepo.owner}/{selectedRepo.name}
            </Link>
          </>
        )}
        <button
          onClick={() => {
            setMessages([{ role: "assistant", content: "Chat cleared. Select a repo and ask me anything." }]);
            setSelectedRepo(null);
            setRepoInput("");
          }}
          className="btn btn-ghost btn-xs ml-auto gap-1"
        >
          <Trash2 size={12} /> Clear
        </button>
      </div>

      {/* Repo selector */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 pointer-events-none" />
            <input
              type="text"
              placeholder="Search or type owner/repo..."
              className="input input-bordered input-sm w-full pl-8 bg-base-100"
              value={repoInput}
              onChange={(e) => handleRepoInputChange(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowSearch(true)}
            />
          </div>
          {selectedRepo && (
            <Link href={`/repo/${selectedRepo.owner}/${selectedRepo.name}/ai`} className="btn btn-sm btn-ghost border border-base-300 gap-1 no-underline shrink-0">
              <GitBranch size={13} /> Open repo
            </Link>
          )}
        </div>
        {showSearch && searchResults.length > 0 && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-base-100 border border-base-300 rounded-xl shadow-xl z-50 overflow-hidden">
            {searchResults.map((r) => (
              <button
                key={r.id}
                onClick={() => selectRepo(r)}
                className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-base-200 text-left border-b border-base-300/50 last:border-0"
              >
                <GitBranch size={13} className="text-primary mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{r.full_name}</p>
                  {r.description && <p className="text-xs text-base-content/50 truncate">{r.description}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
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
            <div className={`chat-bubble text-sm max-w-[85%] ${m.role === "user" ? "bg-primary text-primary-content" : "bg-base-300 text-base-content"}`}>
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

      {/* Suggestions */}
      {messages.length === 1 && selectedRepo && (
        <div className="flex gap-2 flex-wrap">
          {STARTER_SUGGESTIONS.map((s) => (
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
          placeholder={selectedRepo ? `Ask anything about ${selectedRepo.name}...` : "Select a repo first..."}
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
