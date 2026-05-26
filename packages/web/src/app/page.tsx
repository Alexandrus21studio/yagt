"use client";

import { useEffect, useState } from "react";
import { useUser, SignInButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { GitBranch, Star, GitFork, AlertCircle, Clock, Plus, Search, Sparkles, BookOpen, X } from "lucide-react";
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
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("new") === "repo") {
      setShowNewRepo(true);
    }
  }, []);
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

  // New repo modal
  const [showNewRepo, setShowNewRepo] = useState(false);
  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoDesc, setNewRepoDesc] = useState("");
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [newRepoInit, setNewRepoInit] = useState(true);
  const [creatingRepo, setCreatingRepo] = useState(false);
  const [createRepoError, setCreateRepoError] = useState<string | null>(null);

  async function createRepo() {
    if (!newRepoName.trim()) return;
    setCreatingRepo(true);
    setCreateRepoError(null);
    try {
      const res = await fetch("/api/github/user/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRepoName.trim(), description: newRepoDesc, private: newRepoPrivate, auto_init: newRepoInit }),
      });
      const data = await res.json();
      if (data.full_name) {
        setShowNewRepo(false);
        setNewRepoName(""); setNewRepoDesc(""); setNewRepoPrivate(false); setNewRepoInit(true);
        router.push(`/repo/${data.owner.login}/${data.name}`);
      } else {
        setCreateRepoError(data.message ?? "Failed to create repository");
      }
    } catch {
      setCreateRepoError("Network error");
    } finally {
      setCreatingRepo(false);
    }
  }

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
    <div className="flex justify-center items-center h-52">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  );

  if (!isSignedIn) return (
    <div>
      {/* Hero */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 lg:items-center py-10 lg:py-12 border-b border-base-300 mb-10">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light leading-tight text-base-content mb-5">
            Build and ship software<br />
            <span className="text-primary">with AI superpowers</span>
          </h1>
          <p className="text-base sm:text-lg text-base-content/60 leading-relaxed mb-7 max-w-lg">
            yagt is an AI-powered GitHub client. Browse any repository, ask the AI anything about the code, and get instant answers backed by real data.
          </p>
          <div className="flex gap-3 flex-wrap">
            <SignInButton mode="modal">
              <button className="btn btn-success min-h-[44px]">
                Sign in with GitHub
              </button>
            </SignInButton>
            <Link href="/explore" className="btn btn-outline min-h-[44px]">
              Explore repositories
            </Link>
          </div>
        </div>
        <div className="flex flex-col gap-2.5 w-full lg:w-80 shrink-0">
          {[
            { icon: <Sparkles size={15} className="text-primary" />, title: "AI chat on any repo", desc: "Ask questions about any codebase, get instant answers with full context" },
            { icon: <BookOpen size={15} className="text-success" />, title: "Real GitHub data", desc: "Browse repos, issues, PRs, commits — all live from the GitHub API" },
            { icon: <AlertCircle size={15} className="text-secondary" />, title: "Issue intelligence", desc: "AI analyzes issues, suggests labels, severity, and fix strategies" },
          ].map((f) => (
            <div key={f.title} className="card bg-base-200 border border-base-300">
              <div className="card-body py-3.5 px-4 flex flex-row gap-3">
                <div className="mt-0.5 shrink-0">{f.icon}</div>
                <div>
                  <p className="font-semibold text-sm mb-0.5">{f.title}</p>
                  <p className="text-base-content/60 text-xs leading-relaxed">{f.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trending repos */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-base-content">Trending repositories</h2>
          <Link href="/explore" className="text-sm text-primary">Explore more →</Link>
        </div>

        {trendingLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card bg-base-200 border border-base-300 h-32 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trending.map((repo) => (
              <div key={repo.id} className="card bg-base-200 border border-base-300">
                <div className="card-body p-4 gap-2.5">
                  <div className="flex items-center gap-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={repo.owner.avatar_url} alt="" className="w-5 h-5 rounded-full border border-base-300" />
                    <Link href={`/repo/${repo.owner.login}/${repo.name}`} className="text-primary font-semibold text-sm hover:underline truncate">
                      {repo.full_name}
                    </Link>
                  </div>
                  {repo.description && (
                    <p className="text-base-content/60 text-sm leading-relaxed flex-1 line-clamp-2">
                      {repo.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-base-content/60 flex-wrap">
                    {repo.language && (
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: langColor[repo.language] ?? "#888" }} />
                        {repo.language}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Star size={12} /> {repo.stargazers_count.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitFork size={12} /> {repo.forks_count.toLocaleString()}
                    </span>
                    <Link href={`/repo/${repo.owner.login}/${repo.name}/ai`} className="ml-auto text-primary text-xs flex items-center gap-1">
                      <Sparkles size={11} /> Ask AI
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left: repos */}
      <div className="flex-1 min-w-0">
        {/* Filter bar */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="flex-1 relative min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50 pointer-events-none" />
            <input
              type="text"
              placeholder="Find a repository..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input input-bordered input-sm w-full pl-8 bg-base-100"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="select select-bordered select-sm bg-base-200"
          >
            <option value="all">Type: All</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
          <select
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value)}
            className="select select-bordered select-sm bg-base-200"
          >
            <option value="all">Language: All</option>
            {languages.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="select select-bordered select-sm bg-base-200"
          >
            <option value="updated">Sort: Last updated</option>
            <option value="name">Name</option>
            <option value="stars">Stars</option>
          </select>
          <button onClick={() => setShowNewRepo(true)} className="btn btn-sm btn-success gap-1 min-h-[44px] sm:min-h-0">
            <Plus size={14} /> New
          </button>
        </div>

        {error && (
          <div className="alert alert-warning text-sm mb-4">
            <strong>Error:</strong> {error}
            <p className="text-base-content/60 mt-1">Go to Clerk Dashboard → Social Connections → GitHub → enable with <code>repo</code> scope.</p>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-0">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="py-6 border-t border-base-300">
                <div className="h-4 bg-base-300 rounded w-52 mb-2 animate-pulse" />
                <div className="h-3 bg-base-300 rounded w-72 animate-pulse" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-base-content/60">
            {search ? `No repositories matching "${search}"` : "No repositories found."}
          </div>
        ) : (
          <div>
            {filtered.map((repo) => (
              <div key={repo.id} className="py-6 border-t border-base-300">
                <div className="flex justify-between items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Link href={`/repo/${repo.owner.login}/${repo.name}`} className="text-primary font-semibold text-sm hover:underline">
                        {repo.full_name}
                      </Link>
                      <span className="badge badge-sm badge-outline text-base-content/60">
                        {repo.private ? "Private" : "Public"}
                      </span>
                    </div>

                    {repo.description && (
                      <p className="text-base-content/60 text-sm mb-2 leading-relaxed">{repo.description}</p>
                    )}

                    {repo.topics && repo.topics.length > 0 && (
                      <div className="flex gap-1 flex-wrap mb-2">
                        {repo.topics.slice(0, 5).map((t) => (
                          <span key={t} className="badge badge-sm bg-primary/15 text-primary border-none">{t}</span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-base-content/60 text-xs flex-wrap">
                      {repo.language && (
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full inline-block" style={{ background: langColor[repo.language] ?? "#888" }} />
                          {repo.language}
                        </span>
                      )}
                      {repo.stargazers_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Star size={12} /> {repo.stargazers_count.toLocaleString()}
                        </span>
                      )}
                      {repo.forks_count > 0 && (
                        <span className="flex items-center gap-1">
                          <GitFork size={12} /> {repo.forks_count.toLocaleString()}
                        </span>
                      )}
                      {repo.open_issues_count > 0 && (
                        <Link href={`/repo/${repo.owner.login}/${repo.name}/issues`} className="flex items-center gap-1 text-base-content/60">
                          <AlertCircle size={12} /> {repo.open_issues_count}
                        </Link>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> Updated {timeAgo(repo.updated_at)}
                      </span>
                    </div>
                  </div>

                  {/* AI button */}
                  <Link href={`/repo/${repo.owner.login}/${repo.name}/ai`} className="btn btn-sm btn-outline gap-1 shrink-0 whitespace-nowrap min-h-[44px] sm:min-h-0">
                    <Sparkles size={12} className="text-primary" /> Ask AI
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right sidebar */}
      <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4">
        {/* User card */}
        {user && (
          <div className="flex gap-3 items-center py-4 border-b border-base-300">
            {user.imageUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={user.imageUrl} alt="" className="w-12 h-12 rounded-full border border-base-300" />
              : <div className="w-12 h-12 rounded-full bg-success flex items-center justify-center text-white font-bold text-xl">{(user.username ?? "?")[0].toUpperCase()}</div>
            }
            <div>
              <p className="font-semibold text-base">{user.fullName ?? user.username}</p>
              <p className="text-base-content/60 text-sm">@{user.username}</p>
            </div>
          </div>
        )}

        {/* Quick nav */}
        <div className="flex flex-col gap-0">
          {[
            { icon: <BookOpen size={14} />, label: "Your repositories", href: "/" },
            { icon: <GitBranch size={14} />, label: "Your pull requests", href: "/pulls" },
            { icon: <AlertCircle size={14} />, label: "Your issues", href: "/issues" },
            { icon: <Sparkles size={14} />, label: "AI Assistant", href: "/ai" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-2 py-2 text-base-content text-sm border-b border-base-300 hover:text-primary min-h-[44px]">
              <span className="text-base-content/50">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>

        {/* Trending */}
        <div className="card bg-base-200 border border-base-300">
          <div className="card-body p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-base-content">Trending today</h3>
              <Link href="/explore" className="text-xs text-primary">See all</Link>
            </div>
            {trendingLoading ? (
              <div className="flex flex-col gap-2.5">
                {[1,2,3].map((i) => <div key={i} className="h-9 bg-base-300 rounded animate-pulse" />)}
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {trending.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex gap-2 items-start">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.owner.avatar_url} alt="" className="w-[18px] h-[18px] rounded-full border border-base-300 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <Link href={`/repo/${r.owner.login}/${r.name}`} className="text-primary text-xs font-semibold block truncate">
                        {r.full_name}
                      </Link>
                      <div className="flex gap-2 text-[11px] text-base-content/60 mt-0.5">
                        {r.language && <span>{r.language}</span>}
                        <span className="flex items-center gap-0.5"><Star size={10} /> {r.stargazers_count.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link href="/explore" className="block mt-3 text-xs text-base-content/60">
              Explore more repositories →
            </Link>
          </div>
        </div>

        {/* Stats */}
        {repos.length > 0 && (
          <div className="card bg-base-200 border border-base-300">
            <div className="card-body p-4">
              <h3 className="text-sm font-semibold mb-3">Your stats</h3>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-xs">
                  <span className="text-base-content/60">Repositories</span>
                  <span className="font-semibold">{repos.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-base-content/60">Public</span>
                  <span className="font-semibold">{repos.filter((r) => !r.private).length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-base-content/60">Private</span>
                  <span className="font-semibold">{repos.filter((r) => r.private).length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-base-content/60">Total stars</span>
                  <span className="font-semibold">{repos.reduce((s, r) => s + r.stargazers_count, 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Repo Modal */}
      {showNewRepo && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-base-100 border border-base-300 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
              <h2 className="font-semibold text-sm">Create a new repository</h2>
              <button className="btn btn-ghost btn-xs btn-circle" onClick={() => { setShowNewRepo(false); setCreateRepoError(null); }}>
                <X size={14} />
              </button>
            </div>
            <div className="flex flex-col gap-3 p-4">
              <div>
                <label className="text-xs text-base-content/50 mb-1 block">Repository name <span className="text-error">*</span></label>
                <input
                  type="text"
                  className="input input-bordered input-sm w-full bg-base-100"
                  placeholder="my-awesome-project"
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value.replace(/\s+/g, "-"))}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-base-content/50 mb-1 block">Description</label>
                <input
                  type="text"
                  className="input input-bordered input-sm w-full bg-base-100"
                  placeholder="Short description (optional)"
                  value={newRepoDesc}
                  onChange={(e) => setNewRepoDesc(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="radio" className="radio radio-sm" checked={!newRepoPrivate} onChange={() => setNewRepoPrivate(false)} />
                  <span><span className="font-medium">Public</span> <span className="text-base-content/40 text-xs">— Anyone can see this repository</span></span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="radio" className="radio radio-sm" checked={newRepoPrivate} onChange={() => setNewRepoPrivate(true)} />
                  <span><span className="font-medium">Private</span> <span className="text-base-content/40 text-xs">— Only you can see this repository</span></span>
                </label>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-sm border-t border-base-300 pt-2">
                <input type="checkbox" className="checkbox checkbox-sm" checked={newRepoInit} onChange={(e) => setNewRepoInit(e.target.checked)} />
                Initialize with a README
              </label>
              {createRepoError && <div className="alert alert-error text-xs py-2">{createRepoError}</div>}
            </div>
            <div className="flex gap-2 justify-end px-4 pb-4">
              <button className="btn btn-sm btn-ghost" onClick={() => { setShowNewRepo(false); setCreateRepoError(null); }}>Cancel</button>
              <button className="btn btn-sm btn-success" onClick={createRepo} disabled={creatingRepo || !newRepoName.trim()}>
                {creatingRepo && <span className="loading loading-spinner loading-xs" />}
                Create repository
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
