"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { Search, Bell, Plus, Menu, X, GitBranch, ChevronDown } from "lucide-react";

interface SearchResult {
  id: number;
  full_name: string;
  owner: { login: string };
  name: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
}

const NAV_LINKS = [
  { label: "Dashboard", href: "/" },
  { label: "Explore", href: "/explore" },
  { label: "AI", href: "/ai" },
];

export function Header() {
  const { isSignedIn, isLoaded, user } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDrop(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setShowDrop(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/github/search/repositories?q=${encodeURIComponent(query)}&per_page=8&sort=stars`);
        const data = await res.json();
        if (Array.isArray(data.items)) { setResults(data.items); setShowDrop(true); }
      } catch { /* ignore */ } finally { setSearching(false); }
    }, 350);
  }, [query]);

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") { setShowDrop(false); setQuery(""); }
    if (e.key === "Enter" && query.trim()) {
      setShowDrop(false);
      router.push(`/explore?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <>
      <header style={{ background: "#161b22", borderBottom: "1px solid #30363d", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 16px", height: 62, display: "flex", alignItems: "center", gap: 16 }}>

          {/* Logo */}
          <Link href="/" style={{ color: "#e6edf3", display: "flex", alignItems: "center", gap: 8, textDecoration: "none", flexShrink: 0 }}>
            <svg height="32" viewBox="0 0 16 16" width="32" fill="#e6edf3">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            <span style={{ fontWeight: 600, fontSize: 15 }}>yagt</span>
          </Link>

          {/* Search */}
          <div ref={searchRef} style={{ flex: 1, maxWidth: 460, position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, height: 30, padding: "0 12px", gap: 8 }}>
              <Search size={14} style={{ color: "#6e7681", flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search or jump to..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKey}
                onFocus={() => results.length > 0 && setShowDrop(true)}
                style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#e6edf3", fontSize: 13, fontFamily: "inherit" }}
              />
              {searching
                ? <span style={{ color: "#6e7681", fontSize: 11 }}>…</span>
                : <kbd style={{ background: "#21262d", border: "1px solid #30363d", borderRadius: 4, color: "#6e7681", fontSize: 11, padding: "0 5px", lineHeight: "18px" }}>/</kbd>
              }
            </div>

            {showDrop && results.length > 0 && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#161b22", border: "1px solid #30363d", borderRadius: 6, boxShadow: "0 8px 24px rgba(1,4,9,0.8)", zIndex: 200, overflow: "hidden" }}>
                <div style={{ padding: "6px 0" }}>
                  <div style={{ padding: "4px 16px 4px", fontSize: 11, fontWeight: 600, color: "#6e7681", textTransform: "uppercase", letterSpacing: "0.04em" }}>Repositories</div>
                  {results.map((r) => (
                    <Link
                      key={r.id}
                      href={`/repo/${r.owner.login}/${r.name}`}
                      onClick={() => { setShowDrop(false); setQuery(""); }}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 16px", textDecoration: "none", color: "#e6edf3" }}
                      className="gh-search-item"
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#1c2128")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <GitBranch size={14} style={{ color: "#8b949e", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{r.full_name}</div>
                        {r.description && <div style={{ fontSize: 12, color: "#8b949e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.description}</div>}
                      </div>
                      <div style={{ fontSize: 11, color: "#6e7681", flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
                        {r.language && <span>{r.language}</span>}
                        <span>★ {r.stargazers_count.toLocaleString()}</span>
                      </div>
                    </Link>
                  ))}
                  <div style={{ borderTop: "1px solid #21262d", marginTop: 4 }}>
                    <Link
                      href={`/explore?q=${encodeURIComponent(query)}`}
                      onClick={() => { setShowDrop(false); setQuery(""); }}
                      style={{ display: "block", padding: "8px 16px", fontSize: 12, color: "#58a6ff", textDecoration: "none" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#1c2128")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      See all results for &quot;{query}&quot; →
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Desktop nav */}
          <nav style={{ display: "flex", alignItems: "center", gap: 4 }} className="gh-desktop-nav">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} style={{ color: "#e6edf3", fontSize: 13, fontWeight: 600, padding: "4px 8px", borderRadius: 6, textDecoration: "none", whiteSpace: "nowrap" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(177,186,196,0.12)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto", flexShrink: 0 }}>
            {isLoaded && isSignedIn ? (
              <>
                {/* Create new */}
                <Link href="/?new=repo" style={{ display: "flex", alignItems: "center", gap: 2, background: "rgba(177,186,196,0.12)", border: "1px solid #30363d", borderRadius: 6, color: "#e6edf3", padding: "4px 8px", cursor: "pointer", fontSize: 13, textDecoration: "none" }}>
                  <Plus size={14} />
                  <ChevronDown size={12} style={{ color: "#8b949e" }} />
                </Link>

                {/* Notifications */}
                <button style={{ position: "relative", background: "none", border: "none", color: "#e6edf3", cursor: "pointer", padding: 4, borderRadius: 6 }}>
                  <Bell size={16} />
                  <span style={{ position: "absolute", top: 2, right: 2, width: 8, height: 8, background: "#2f81f4", borderRadius: "50%", border: "2px solid #161b22" }} />
                </button>

                {/* Avatar + menu */}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <UserButton />
                  <span style={{ fontSize: 12, color: "#8b949e" }}>{user?.username}</span>
                </div>
              </>
            ) : isLoaded ? (
              <div style={{ display: "flex", gap: 8 }}>
                <SignInButton mode="modal">
                  <button style={{ background: "none", border: "1px solid #30363d", borderRadius: 6, color: "#e6edf3", padding: "4px 12px", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                    Sign in
                  </button>
                </SignInButton>
                <SignInButton mode="modal">
                  <button style={{ background: "#238636", border: "1px solid rgba(240,246,252,0.1)", borderRadius: 6, color: "#ffffff", padding: "4px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                    Sign up
                  </button>
                </SignInButton>
              </div>
            ) : null}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              style={{ background: "none", border: "none", color: "#e6edf3", cursor: "pointer", padding: 4, display: "none" }}
              className="gh-mobile-hamburger"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div style={{ background: "#161b22", borderBottom: "1px solid #30363d", padding: "8px 16px 16px" }} className="gh-mobile-nav">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
              style={{ display: "block", padding: "8px 0", color: "#e6edf3", textDecoration: "none", fontSize: 14, fontWeight: 600, borderBottom: "1px solid #21262d" }}>
              {l.label}
            </Link>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 767px) {
          .gh-desktop-nav { display: none !important; }
          .gh-mobile-hamburger { display: flex !important; }
        }
      `}</style>
    </>
  );
}
