"use client";

import { useEffect, useState } from "react";
import { useUser, SignInButton } from "@clerk/nextjs";
import { GitBranch, Star, GitFork, AlertCircle, Clock, Plus, Search, Sparkles, BookOpen } from "lucide-react";
import Link from "next/link";

interface GHRepo {
  id: number;
  full_name: string;
  owner: { login: string };
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  updated_at: string;
  private: boolean;
  topics: string[];
}

const langColor: Record<string, string> = {
  TypeScript: "#3178c6", Rust: "#dea584", Go: "#00add8",
  Python: "#3572a5", JavaScript: "#f0db4f", "C++": "#f34b7d",
  Ruby: "#701516", Swift: "#fa7343", Kotlin: "#a97bff", Java: "#b07219",
  Shell: "#89e051", HTML: "#e34c26", CSS: "#563d7c", Vue: "#41b883",
  "C#": "#178600", C: "#555555",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

interface TrendingRepo {
  id: number;
  full_name: string;
  owner: { login: string; avatar_url: string };
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
}

export default function Dashboard() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [repos, setRepos] = useState<GHRepo[]>([]);
  const [filtered, setFiltered] = useState<GHRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [langFilter, setLangFilter] = useState("all");
  const [sort, setSort] = useState("updated");
  const [trending, setTrending] = useState<TrendingRepo[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);

  useEffect(() => {
    setTrendingLoading(true);
    fetch("/api/github/search/repositories?q=stars:%3E10000+pushed:%3E2024-01-01&sort=stars&per_page=12")
      .then((r) => r.json())
      .then((d) => Array.isArray(d.items) && setTrending(d.items))
      .catch(() => {})
      .finally(() => setTrendingLoading(false));
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    setLoading(true);
    fetch("/api/github/user/repos?sort=updated&per_page=100&type=all")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) { setRepos(data); setFiltered(data); }
        else setError(data.message ?? "Failed to load repositories");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [isSignedIn]);

  useEffect(() => {
    let out = [...repos];
    if (search) out = out.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()) || (r.description ?? "").toLowerCase().includes(search.toLowerCase()));
    if (typeFilter === "public") out = out.filter((r) => !r.private);
    if (typeFilter === "private") out = out.filter((r) => r.private);
    if (typeFilter === "forked") out = out.filter((r) => r.full_name.split("/")[0] !== r.owner.login);
    if (langFilter !== "all") out = out.filter((r) => r.language === langFilter);
    if (sort === "name") out = out.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "stars") out = out.sort((a, b) => b.stargazers_count - a.stargazers_count);
    setFiltered(out);
  }, [repos, search, typeFilter, langFilter, sort]);

  const languages = Array.from(new Set(repos.map((r) => r.language).filter(Boolean))) as string[];

  if (!isLoaded) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200 }}>
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  );

  if (!isSignedIn) return (
    <div>
      {/* Hero */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 40, alignItems: "center", padding: "48px 0 40px", borderBottom: "1px solid #21262d", marginBottom: 40 }} className="gh-landing-hero">
        <div>
          <h1 style={{ fontSize: 52, fontWeight: 300, lineHeight: 1.2, color: "#e6edf3", marginBottom: 20 }}>
            Build and ship software<br />
            <span style={{ color: "#58a6ff" }}>with AI superpowers</span>
          </h1>
          <p style={{ fontSize: 18, color: "#8b949e", lineHeight: 1.6, marginBottom: 28, maxWidth: 460 }}>
            yagt is an AI-powered GitHub client. Browse any repository, ask the AI anything about the code, and get instant answers backed by real data.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <SignInButton mode="modal">
              <button style={{ background: "#238636", border: "1px solid rgba(240,246,252,0.1)", borderRadius: 6, color: "#fff", padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Sign in with GitHub
              </button>
            </SignInButton>
            <Link href="/explore" style={{ background: "none", border: "1px solid #30363d", borderRadius: 6, color: "#e6edf3", padding: "10px 20px", fontSize: 14, fontWeight: 500, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
              Explore repositories
            </Link>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { icon: <Sparkles size={15} style={{ color: "#58a6ff" }} />, title: "AI chat on any repo", desc: "Ask questions about any codebase, get instant answers with full context" },
            { icon: <BookOpen size={15} style={{ color: "#3fb950" }} />, title: "Real GitHub data", desc: "Browse repos, issues, PRs, commits — all live from the GitHub API" },
            { icon: <AlertCircle size={15} style={{ color: "#a371f7" }} />, title: "Issue intelligence", desc: "AI analyzes issues, suggests labels, severity, and fix strategies" },
          ].map((f) => (
            <div key={f.title} style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 6, padding: "14px 16px", display: "flex", gap: 12 }}>
              <div style={{ marginTop: 1, flexShrink: 0 }}>{f.icon}</div>
              <div>
                <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{f.title}</p>
                <p style={{ color: "#8b949e", fontSize: 12, lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trending repos */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#e6edf3" }}>Trending repositories</h2>
          <Link href="/explore" style={{ fontSize: 13, color: "#58a6ff", textDecoration: "none" }}>Explore more →</Link>
        </div>

        {trendingLoading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 6, padding: 16, height: 120 }} className="animate-pulse" />
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {trending.map((repo) => (
              <div key={repo.id} style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 6, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <img src={repo.owner.avatar_url} alt="" style={{ width: 20, height: 20, borderRadius: "50%", border: "1px solid #30363d" }} />
                  <Link href={`/repo/${repo.owner.login}/${repo.name}`}
                    style={{ color: "#58a6ff", fontWeight: 600, fontSize: 14, textDecoration: "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                  >
                    {repo.full_name}
                  </Link>
                </div>
                {repo.description && (
                  <p style={{ color: "#8b949e", fontSize: 13, lineHeight: 1.5, flex: 1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>
                    {repo.description}
                  </p>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12, color: "#8b949e" }}>
                  {repo.language && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: langColor[repo.language] ?? "#888", display: "inline-block" }} />
                      {repo.language}
                    </span>
                  )}
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <Star size={12} /> {repo.stargazers_count.toLocaleString()}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <GitFork size={12} /> {repo.forks_count.toLocaleString()}
                  </span>
                  <Link href={`/repo/${repo.owner.login}/${repo.name}/ai`}
                    style={{ marginLeft: "auto", color: "#58a6ff", fontSize: 11, textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}
                  >
                    <Sparkles size={11} /> Ask AI
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`@media(max-width:767px){.gh-landing-hero{grid-template-columns:1fr!important;}}`}</style>
    </div>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 296px", gap: 24 }} className="gh-dashboard">
      {/* Left: repos */}
      <div>
        {/* Filter bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, position: "relative", minWidth: 200 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#6e7681", pointerEvents: "none" }} />
            <input
              type="text"
              placeholder="Find a repository..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, padding: "5px 12px 5px 32px", color: "#e6edf3", fontSize: 13, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ background: "#21262d", border: "1px solid #30363d", borderRadius: 6, color: "#e6edf3", padding: "5px 24px 5px 12px", fontSize: 13, cursor: "pointer" }}
          >
            <option value="all">Type: All</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
          <select
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value)}
            style={{ background: "#21262d", border: "1px solid #30363d", borderRadius: 6, color: "#e6edf3", padding: "5px 24px 5px 12px", fontSize: 13, cursor: "pointer" }}
          >
            <option value="all">Language: All</option>
            {languages.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{ background: "#21262d", border: "1px solid #30363d", borderRadius: 6, color: "#e6edf3", padding: "5px 24px 5px 12px", fontSize: 13, cursor: "pointer" }}
          >
            <option value="updated">Sort: Last updated</option>
            <option value="name">Name</option>
            <option value="stars">Stars</option>
          </select>
          <Link href="#" style={{ background: "#238636", border: "1px solid rgba(240,246,252,0.1)", borderRadius: 6, color: "#fff", padding: "5px 16px", fontSize: 13, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
            <Plus size={14} /> New
          </Link>
        </div>

        {error && (
          <div style={{ background: "#161b22", border: "1px solid #f0883e", borderRadius: 6, padding: "12px 16px", color: "#f0883e", marginBottom: 16, fontSize: 13 }}>
            <strong>Error:</strong> {error}
            <p style={{ color: "#8b949e", marginTop: 4 }}>Go to Clerk Dashboard → Social Connections → GitHub → enable with <code>repo</code> scope.</p>
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ padding: "24px 0", borderTop: "1px solid #21262d" }}>
                <div style={{ height: 16, background: "#21262d", borderRadius: 4, width: 200, marginBottom: 8 }} className="animate-pulse" />
                <div style={{ height: 13, background: "#21262d", borderRadius: 4, width: 300 }} className="animate-pulse" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#8b949e" }}>
            {search ? `No repositories matching "${search}"` : "No repositories found."}
          </div>
        ) : (
          <div>
            {filtered.map((repo) => (
              <div key={repo.id} style={{ padding: "24px 0", borderTop: "1px solid #21262d" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                      <Link href={`/repo/${repo.owner.login}/${repo.name}`}
                        style={{ color: "#58a6ff", fontWeight: 600, fontSize: 14, textDecoration: "none" }}
                        onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                        onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                      >
                        {repo.full_name}
                      </Link>
                      <span style={{ border: "1px solid #30363d", borderRadius: "2em", color: "#8b949e", fontSize: 11, fontWeight: 500, padding: "0 7px", lineHeight: "18px" }}>
                        {repo.private ? "Private" : "Public"}
                      </span>
                    </div>

                    {repo.description && (
                      <p style={{ color: "#8b949e", fontSize: 13, marginBottom: 8, lineHeight: 1.5 }}>{repo.description}</p>
                    )}

                    {repo.topics && repo.topics.length > 0 && (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                        {repo.topics.slice(0, 5).map((t) => (
                          <span key={t} style={{ background: "rgba(56,139,253,0.15)", color: "#58a6ff", borderRadius: "2em", fontSize: 11, fontWeight: 500, padding: "2px 10px" }}>{t}</span>
                        ))}
                      </div>
                    )}

                    <div style={{ display: "flex", alignItems: "center", gap: 16, color: "#8b949e", fontSize: 12, flexWrap: "wrap" }}>
                      {repo.language && (
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ width: 12, height: 12, borderRadius: "50%", background: langColor[repo.language] ?? "#888", display: "inline-block" }} />
                          {repo.language}
                        </span>
                      )}
                      {repo.stargazers_count > 0 && (
                        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <Star size={12} /> {repo.stargazers_count.toLocaleString()}
                        </span>
                      )}
                      {repo.forks_count > 0 && (
                        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <GitFork size={12} /> {repo.forks_count.toLocaleString()}
                        </span>
                      )}
                      {repo.open_issues_count > 0 && (
                        <Link href={`/repo/${repo.owner.login}/${repo.name}/issues`} style={{ display: "flex", alignItems: "center", gap: 3, color: "#8b949e", textDecoration: "none" }}>
                          <AlertCircle size={12} /> {repo.open_issues_count}
                        </Link>
                      )}
                      <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <Clock size={12} /> Updated {timeAgo(repo.updated_at)}
                      </span>
                    </div>
                  </div>

                  {/* AI button */}
                  <Link href={`/repo/${repo.owner.login}/${repo.name}/ai`}
                    style={{ border: "1px solid #30363d", borderRadius: 6, color: "#e6edf3", fontSize: 12, fontWeight: 500, padding: "4px 12px", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, flexShrink: 0, whiteSpace: "nowrap", background: "#21262d" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#58a6ff")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#30363d")}
                  >
                    <Sparkles size={12} style={{ color: "#58a6ff" }} /> Ask AI
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right sidebar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* User card */}
        {user && (
          <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "16px 0", borderBottom: "1px solid #21262d" }}>
            {user.imageUrl
              ? <img src={user.imageUrl} alt="" style={{ width: 48, height: 48, borderRadius: "50%", border: "1px solid #30363d" }} />
              : <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#238636", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 20 }}>{(user.username ?? "?")[0].toUpperCase()}</div>
            }
            <div>
              <p style={{ fontWeight: 600, fontSize: 15 }}>{user.fullName ?? user.username}</p>
              <p style={{ color: "#8b949e", fontSize: 13 }}>@{user.username}</p>
            </div>
          </div>
        )}

        {/* Quick nav */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {[
            { icon: <BookOpen size={14} />, label: "Your repositories", href: "/" },
            { icon: <GitBranch size={14} />, label: "Your pull requests", href: "/pulls" },
            { icon: <AlertCircle size={14} />, label: "Your issues", href: "/issues" },
            { icon: <Sparkles size={14} />, label: "AI Assistant", href: "/ai" },
          ].map((item) => (
            <Link key={item.href} href={item.href}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", color: "#e6edf3", textDecoration: "none", fontSize: 13, borderBottom: "1px solid #21262d" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#58a6ff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#e6edf3")}
            >
              <span style={{ color: "#6e7681" }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>

        {/* Trending */}
        <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 6, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: "#e6edf3" }}>Trending today</h3>
            <Link href="/explore" style={{ fontSize: 11, color: "#58a6ff", textDecoration: "none" }}>See all</Link>
          </div>
          {trendingLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2,3].map((i) => <div key={i} style={{ height: 36, background: "#21262d", borderRadius: 4 }} className="animate-pulse" />)}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {trending.slice(0, 5).map((r) => (
                <div key={r.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <img src={r.owner.avatar_url} alt="" style={{ width: 18, height: 18, borderRadius: "50%", border: "1px solid #30363d", flexShrink: 0, marginTop: 1 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/repo/${r.owner.login}/${r.name}`}
                      style={{ color: "#58a6ff", fontSize: 12, fontWeight: 600, textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.full_name}
                    </Link>
                    <div style={{ display: "flex", gap: 8, fontSize: 11, color: "#8b949e", marginTop: 2 }}>
                      {r.language && <span>{r.language}</span>}
                      <span style={{ display: "flex", alignItems: "center", gap: 2 }}><Star size={10} /> {r.stargazers_count.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link href="/explore" style={{ display: "block", marginTop: 12, fontSize: 12, color: "#8b949e", textDecoration: "none" }}>
            Explore more repositories →
          </Link>
        </div>

        {/* Stats */}
        {repos.length > 0 && (
          <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 6, padding: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Your stats</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#8b949e" }}>Repositories</span>
                <span style={{ fontWeight: 600 }}>{repos.length}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#8b949e" }}>Public</span>
                <span style={{ fontWeight: 600 }}>{repos.filter((r) => !r.private).length}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#8b949e" }}>Private</span>
                <span style={{ fontWeight: 600 }}>{repos.filter((r) => r.private).length}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#8b949e" }}>Total stars</span>
                <span style={{ fontWeight: 600 }}>{repos.reduce((s, r) => s + r.stargazers_count, 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`@media(max-width:767px){.gh-dashboard{grid-template-columns:1fr!important;}}`}</style>
    </div>
  );
}
