"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Star, GitFork, AlertCircle, GitBranch, Globe } from "lucide-react";
import Link from "next/link";

interface GHRepo {
  id: number;
  full_name: string;
  owner: { login: string; avatar_url: string };
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  updated_at: string;
  topics: string[];
}

const langColor: Record<string, string> = {
  TypeScript: "#3178c6", Rust: "#dea584", Go: "#00add8",
  Python: "#3572a5", JavaScript: "#f0db4f", "C++": "#f34b7d",
  Ruby: "#701516", Swift: "#fa7343", Kotlin: "#a97bff", Java: "#b07219",
};

const TRENDING_QUERIES = [
  { label: "Trending", q: "stars:>1000 pushed:>2024-01-01", sort: "stars" },
  { label: "AI/ML", q: "topic:machine-learning stars:>500", sort: "stars" },
  { label: "Web", q: "topic:web stars:>500", sort: "stars" },
  { label: "CLI Tools", q: "topic:cli stars:>200", sort: "stars" },
  { label: "Rust", q: "language:Rust stars:>500", sort: "stars" },
  { label: "TypeScript", q: "language:TypeScript stars:>500", sort: "stars" },
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "today";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function ExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQ = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const [inputVal, setInputVal] = useState(initialQ);
  const [activeFilter, setActiveFilter] = useState(0);
  const [repos, setRepos] = useState<GHRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const doSearch = useCallback(async (q: string, sort = "stars") => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/github/search/repositories?q=${encodeURIComponent(q)}&per_page=24&sort=${sort}`
      );
      const data = await res.json();
      if (Array.isArray(data.items)) {
        setRepos(data.items);
        setTotalCount(data.total_count ?? 0);
      }
    } catch {
      setRepos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (query) {
      doSearch(query, "stars");
    } else {
      doSearch(TRENDING_QUERIES[activeFilter].q, TRENDING_QUERIES[activeFilter].sort);
    }
  }, [query, activeFilter, doSearch]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = inputVal.trim();
    setQuery(q);
    if (q) router.replace(`/explore?q=${encodeURIComponent(q)}`);
    else router.replace("/explore");
  }

  return (
    <div className="flex flex-col gap-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <Globe size={18} className="text-primary" />
        <h1 className="text-xl font-bold">Explore</h1>
        <span className="text-base-content/40 text-sm">· Browse GitHub repositories</span>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-xl">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 pointer-events-none" />
          <input
            type="text"
            placeholder="Search all GitHub repositories..."
            className="input input-bordered input-sm w-full pl-8 bg-base-100"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-sm btn-primary">Search</button>
        {query && (
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => { setQuery(""); setInputVal(""); router.replace("/explore"); }}
          >
            Clear
          </button>
        )}
      </form>

      {/* Filter tabs (only when no query) */}
      {!query && (
        <div className="flex gap-1 flex-wrap">
          {TRENDING_QUERIES.map((f, i) => (
            <button
              key={f.label}
              onClick={() => setActiveFilter(i)}
              className={`btn btn-xs ${activeFilter === i ? "btn-primary" : "btn-ghost border border-base-300"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Results count */}
      {!loading && (repos.length > 0 || query) && (
        <p className="text-sm text-base-content/50">
          {query
            ? `${totalCount.toLocaleString()} results for "${query}"`
            : `${repos.length} repositories`}
        </p>
      )}

      {/* Repo grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card card-bordered bg-base-200 animate-pulse">
              <div className="card-body gap-2 py-3">
                <div className="h-4 bg-base-300 rounded w-40" />
                <div className="h-3 bg-base-300 rounded w-64" />
                <div className="h-3 bg-base-300 rounded w-24 mt-1" />
              </div>
            </div>
          ))}
        </div>
      ) : repos.length === 0 ? (
        <div className="text-center py-16 text-base-content/40">
          {query ? "No repositories found." : "Loading..."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {repos.map((repo) => (
            <div key={repo.id} className="card card-bordered bg-base-200 hover:border-primary/50 transition-colors group">
              <div className="card-body gap-2 py-3">
                <div className="flex items-start gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={repo.owner.avatar_url}
                    alt={repo.owner.login}
                    className="w-5 h-5 rounded-full mt-0.5 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/repo/${repo.owner.login}/${repo.name}`}
                      className="font-semibold text-primary hover:underline text-sm"
                    >
                      {repo.full_name}
                    </Link>
                    {repo.description && (
                      <p className="text-xs text-base-content/60 mt-0.5 line-clamp-2">{repo.description}</p>
                    )}
                  </div>
                </div>

                {repo.topics && repo.topics.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {repo.topics.slice(0, 4).map((t) => (
                      <span key={t} className="badge badge-xs badge-ghost border border-primary/20 text-primary/70">{t}</span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3 text-xs text-base-content/40 flex-wrap">
                  {repo.language && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ background: langColor[repo.language] ?? "#888" }} />
                      {repo.language}
                    </span>
                  )}
                  <span className="flex items-center gap-1"><Star size={11} /> {repo.stargazers_count.toLocaleString()}</span>
                  <span className="flex items-center gap-1"><GitFork size={11} /> {repo.forks_count.toLocaleString()}</span>
                  {repo.open_issues_count > 0 && (
                    <span className="flex items-center gap-1"><AlertCircle size={11} /> {repo.open_issues_count}</span>
                  )}
                  <span className="ml-auto">Updated {timeAgo(repo.updated_at)}</span>
                </div>

                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link
                    href={`/repo/${repo.owner.login}/${repo.name}`}
                    className="btn btn-xs btn-ghost gap-1 no-underline"
                  >
                    <GitBranch size={11} /> View
                  </Link>
                  <Link
                    href={`/repo/${repo.owner.login}/${repo.name}/ai`}
                    className="btn btn-xs btn-primary gap-1 no-underline"
                  >
                    Ask AI
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><span className="loading loading-spinner loading-lg text-primary" /></div>}>
      <ExploreContent />
    </Suspense>
  );
}
