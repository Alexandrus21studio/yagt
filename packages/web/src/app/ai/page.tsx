"use client";

import { useState, useRef, useEffect } from "react";
import {
  Bot, Send, Sparkles, Trash2, User, Search,
  GitBranch, ChevronRight, Zap, Code, FileText, Bug,
} from "lucide-react";
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
  language: string | null;
  stargazers_count: number;
}

const SUGGESTIONS = [
  { icon: Code,     text: "Explain the architecture of this repo" },
  { icon: FileText, text: "Summarize the README and purpose" },
  { icon: Bug,      text: "What bugs or issues exist?" },
  { icon: Zap,      text: "How do I get started contributing?" },
];

export default function GlobalAIPage() {
  const [repoInput, setRepoInput] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<{ owner: string; name: string } | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!repoInput.trim() || repoInput.includes("/")) {
      setSearchResults([]);
      setShowSearch(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/github/search/repositories?q=${encodeURIComponent(repoInput)}&per_page=6&sort=stars`);
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
    setMessages([{
      role: "assistant",
      content: `I'm ready to help with **${r.full_name}**${r.description ? ` — *${r.description}*` : ""}. I can read the README, file structure, issues, and recent commits. What would you like to know?`,
    }]);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function handleRepoInputChange(val: string) {
    setRepoInput(val);
    const parts = val.split("/");
    if (parts.length === 2 && parts[0] && parts[1]) {
      setSelectedRepo({ owner: parts[0], name: parts[1] });
    } else if (!val.includes("/")) {
      setSelectedRepo(null);
    }
  }

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
    if (!selectedRepo) {
      setMessages((prev) => [
        ...prev,
        { role: "user", content },
        { role: "assistant", content: "Please select a repository first using the search box above." },
      ]);
      setInput("");
      return;
    }
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
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

  function clearChat() {
    setMessages([]);
    setSelectedRepo(null);
    setRepoInput("");
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] max-w-3xl mx-auto">

      {/* Top bar */}
      <div className="shrink-0 flex items-center gap-3 py-3 border-b border-base-300">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Sparkles size={15} className="text-primary shrink-0" />
          <span className="font-semibold text-sm">AI Assistant</span>
          {selectedRepo && (
            <>
              <ChevronRight size={13} className="text-base-content/30 shrink-0" />
              <Link
                href={`/repo/${selectedRepo.owner}/${selectedRepo.name}`}
                className="text-primary text-sm font-mono truncate no-underline hover:underline"
              >
                {selectedRepo.owner}/{selectedRepo.name}
              </Link>
              <Link
                href={`/repo/${selectedRepo.owner}/${selectedRepo.name}/ai`}
                className="btn btn-xs btn-ghost border border-base-300 gap-1 no-underline shrink-0 ml-1"
              >
                <GitBranch size={11} /> Repo AI
              </Link>
            </>
          )}
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} className="btn btn-ghost btn-xs gap-1 text-base-content/50 hover:text-base-content shrink-0">
            <Trash2 size={12} /> Clear
          </button>
        )}
      </div>

      {/* Repo selector */}
      <div ref={searchRef} className="shrink-0 relative py-2 border-b border-base-300">
        <div className="flex items-center bg-base-200 border border-base-300 rounded-lg h-9 px-3 gap-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
          <Search size={13} className="text-base-content/40 shrink-0" />
          <input
            type="text"
            placeholder="Search a repository or type owner/repo…"
            className="flex-1 bg-transparent border-none outline-none text-sm text-base-content placeholder:text-base-content/40"
            value={repoInput}
            onChange={(e) => handleRepoInputChange(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowSearch(true)}
          />
          {repoInput && (
            <button
              onClick={() => { setRepoInput(""); setSelectedRepo(null); setSearchResults([]); }}
              className="text-base-content/30 hover:text-base-content/60 text-xs leading-none"
            >
              ✕
            </button>
          )}
        </div>

        {showSearch && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-base-100 border border-base-300 rounded-xl shadow-2xl z-50 overflow-hidden">
            {searchResults.map((r) => (
              <button
                key={r.id}
                onClick={() => selectRepo(r)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-base-200 text-left border-b border-base-300/40 last:border-0 transition-colors"
              >
                <GitBranch size={13} className="text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{r.full_name}</p>
                  {r.description && <p className="text-xs text-base-content/50 truncate">{r.description}</p>}
                </div>
                <div className="flex items-center gap-2 text-xs text-base-content/40 shrink-0">
                  {r.language && <span>{r.language}</span>}
                  <span>★ {r.stargazers_count.toLocaleString()}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isEmpty ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full gap-6 px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Bot size={28} className="text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-1">Ask anything about a repo</h2>
              <p className="text-base-content/50 text-sm max-w-xs">
                Search for a GitHub repository above, then ask about architecture, bugs, contribution guides, and more.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-sm">
              {SUGGESTIONS.map(({ icon: Icon, text }) => (
                <button
                  key={text}
                  onClick={() => sendMessage(text)}
                  disabled={!selectedRepo}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-base-300 bg-base-200 hover:bg-base-300 text-left text-sm text-base-content/70 hover:text-base-content transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Icon size={14} className="text-primary shrink-0" />
                  <span>{text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1 py-4 px-2">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-3 px-2 py-1.5 rounded-xl group ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${m.role === "assistant" ? "bg-primary/15" : "bg-base-300"}`}>
                  {m.role === "assistant"
                    ? <Bot size={14} className="text-primary" />
                    : <User size={14} className="text-base-content/60" />}
                </div>

                {/* Bubble */}
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

            {/* Suggestions after first reply */}
            {messages.length === 1 && selectedRepo && (
              <div className="flex flex-wrap gap-2 px-2 pt-2">
                {SUGGESTIONS.map(({ text }) => (
                  <button
                    key={text}
                    onClick={() => sendMessage(text)}
                    className="btn btn-xs btn-ghost border border-base-300 text-base-content/60 hover:text-base-content normal-case font-normal"
                  >
                    {text}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-base-300 pt-3 pb-2">
        <div className="flex items-end gap-2 bg-base-200 border border-base-300 rounded-2xl px-4 py-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
          <textarea
            ref={inputRef}
            rows={1}
            placeholder={selectedRepo ? `Ask anything about ${selectedRepo.name}… (Enter to send, Shift+Enter for newline)` : "Select a repository above first…"}
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
