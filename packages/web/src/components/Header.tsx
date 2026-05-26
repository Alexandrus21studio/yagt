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
  { label: "Settings", href: "/settings" },
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
      <header className="bg-base-200 border-b border-base-300 sticky top-0 z-[100]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0 no-underline">
            <svg height="28" viewBox="0 0 16 16" width="28" fill="currentColor" className="text-base-content">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            <span className="font-bold text-lg text-primary">yagt</span>
          </Link>

          {/* Search */}
          <div ref={searchRef} className="flex-1 max-w-md relative hidden sm:block">
            <div className="flex items-center bg-base-100 border border-base-300 rounded-md h-8 px-3 gap-2">
              <Search size={14} className="text-base-content/50 shrink-0" />
              <input
                type="text"
                placeholder="Search or jump to..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKey}
                onFocus={() => results.length > 0 && setShowDrop(true)}
                className="flex-1 bg-transparent border-none outline-none text-sm text-base-content"
              />
              {searching
                ? <span className="text-base-content/50 text-xs">…</span>
                : <kbd className="kbd kbd-xs">/</kbd>
              }
            </div>

            {showDrop && results.length > 0 && (
              <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-base-200 border border-base-300 rounded-md shadow-2xl z-[200] overflow-hidden">
                <div className="py-1.5">
                  <div className="px-4 pt-1 pb-1 text-[11px] font-semibold text-base-content/50 uppercase tracking-wider">Repositories</div>
                  {results.map((r) => (
                    <Link
                      key={r.id}
                      href={`/repo/${r.owner.login}/${r.name}`}
                      onClick={() => { setShowDrop(false); setQuery(""); }}
                      className="flex items-center gap-2.5 px-4 py-1.5 no-underline text-base-content hover:bg-base-300"
                    >
                      <GitBranch size={14} className="text-base-content/50 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{r.full_name}</div>
                        {r.description && <div className="text-xs text-base-content/60 truncate">{r.description}</div>}
                      </div>
                      <div className="text-[11px] text-base-content/50 shrink-0 flex items-center gap-1.5">
                        {r.language && <span>{r.language}</span>}
                        <span>★ {r.stargazers_count.toLocaleString()}</span>
                      </div>
                    </Link>
                  ))}
                  <div className="border-t border-base-300 mt-1">
                    <Link
                      href={`/explore?q=${encodeURIComponent(query)}`}
                      onClick={() => { setShowDrop(false); setQuery(""); }}
                      className="block px-4 py-2 text-xs text-primary no-underline hover:bg-base-300"
                    >
                      See all results for &quot;{query}&quot; →
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-base-content text-sm font-semibold px-2 py-1 rounded-md no-underline whitespace-nowrap hover:bg-base-300"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {isLoaded && isSignedIn ? (
              <>
                {/* Create new */}
                <Link
                  href="/?new=repo"
                  className="hidden sm:flex items-center gap-0.5 bg-base-300 border border-base-300 rounded-md text-base-content px-2 min-h-[44px] sm:min-h-0 sm:py-1 text-sm no-underline hover:bg-base-100"
                >
                  <Plus size={14} />
                  <ChevronDown size={12} className="text-base-content/50" />
                </Link>

                {/* Notifications */}
                <button className="btn btn-ghost btn-sm min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 relative">
                  <Bell size={16} />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full border-2 border-base-200" />
                </button>

                {/* Avatar + menu */}
                <div className="flex items-center gap-1">
                  <UserButton />
                  <span className="hidden md:inline text-xs text-base-content/60">{user?.username}</span>
                </div>
              </>
            ) : isLoaded ? (
              <div className="flex gap-2">
                <SignInButton mode="modal">
                  <button className="btn btn-sm btn-outline min-h-[44px] sm:min-h-0">
                    Sign in
                  </button>
                </SignInButton>
                <SignInButton mode="modal">
                  <button className="btn btn-sm btn-success min-h-[44px] sm:min-h-0">
                    Sign up
                  </button>
                </SignInButton>
              </div>
            ) : null}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="btn btn-ghost btn-sm min-h-[44px] min-w-[44px] md:hidden"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="bg-base-200 border-b border-base-300 px-4 py-2 md:hidden">
          {/* Mobile search */}
          <div className="sm:hidden mb-2">
            <div className="flex items-center bg-base-100 border border-base-300 rounded-md h-10 px-3 gap-2">
              <Search size={14} className="text-base-content/50 shrink-0" />
              <input
                type="text"
                placeholder="Search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKey}
                className="flex-1 bg-transparent border-none outline-none text-sm text-base-content"
              />
            </div>
          </div>
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-base-content no-underline text-sm font-semibold border-b border-base-300 last:border-b-0 min-h-[44px] flex items-center"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
