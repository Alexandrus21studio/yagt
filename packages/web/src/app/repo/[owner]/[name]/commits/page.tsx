"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { GitCommit, Clock, ChevronDown, ExternalLink } from "lucide-react";
import Link from "next/link";

interface GHCommit {
  sha: string;
  commit: {
    message: string;
    author: { date: string; name: string; email: string };
  };
  author: { login: string; avatar_url: string } | null;
  html_url: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function groupByDate(commits: GHCommit[]) {
  const groups: Record<string, GHCommit[]> = {};
  for (const c of commits) {
    const day = c.commit.author.date.split("T")[0];
    if (!groups[day]) groups[day] = [];
    groups[day].push(c);
  }
  return groups;
}

export default function CommitsPage() {
  const params = useParams<{ owner: string; name: string }>();
  const { owner, name } = params;

  const [commits, setCommits] = useState<GHCommit[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSha, setExpandedSha] = useState<string | null>(null);

  const loadCommits = useCallback(async (p: number, append = false) => {
    if (p === 1) setLoading(true); else setLoadingMore(true);
    try {
      const res = await fetch(`/api/github/repos/${owner}/${name}/commits?per_page=30&page=${p}`);
      const data = await res.json();
      if (!Array.isArray(data)) {
        setError(data.message ?? "Failed to load commits");
        return;
      }
      setHasMore(data.length === 30);
      setCommits((prev) => append ? [...prev, ...data] : data);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [owner, name]);

  useEffect(() => {
    loadCommits(1);
  }, [loadCommits]);

  async function loadMore() {
    const next = page + 1;
    setPage(next);
    await loadCommits(next, true);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  );

  if (error) return <div className="alert alert-error">{error}</div>;

  const grouped = groupByDate(commits);
  const days = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-sm text-base-content/50">
          <Link href="/" className="hover:text-primary">{owner}</Link>
          <span>/</span>
          <Link href={`/repo/${owner}/${name}`} className="hover:text-primary">{name}</Link>
          <span>/</span>
          <span className="text-base-content">commits</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-bordered overflow-x-auto flex-nowrap gap-0">
        {[
          { label: "Code", href: "" },
          { label: "Issues", href: "/issues" },
          { label: "Pull requests", href: "/pulls" },
          { label: "Commits", href: "/commits" },
          { label: "AI Assistant", href: "/ai" },
        ].map((t) => (
          <Link key={t.label} href={`/repo/${owner}/${name}${t.href}`}
            className={`tab whitespace-nowrap${t.label === "Commits" ? " tab-active" : ""}`}>
            {t.label}
          </Link>
        ))}
      </div>

      {/* Commit count */}
      <p className="text-sm text-base-content/50 flex items-center gap-1.5">
        <GitCommit size={14} />
        {commits.length}{hasMore ? "+" : ""} commits
      </p>

      {/* Grouped commits */}
      <div className="flex flex-col gap-6">
        {days.map((day) => (
          <div key={day} className="flex flex-col gap-1">
            {/* Day header */}
            <div className="flex items-center gap-2 text-xs text-base-content/40 font-medium uppercase tracking-wide mb-1">
              <Clock size={11} />
              {formatDate(day + "T00:00:00Z")}
              <div className="flex-1 h-px bg-base-300 ml-1" />
            </div>

            {/* Commits for this day */}
            <div className="card card-bordered bg-base-200 overflow-hidden">
              {grouped[day].map((c, i) => {
                const isLast = i === grouped[day].length - 1;
                const isExpanded = expandedSha === c.sha;
                const lines = c.commit.message.split("\n").filter(Boolean);
                const title = lines[0];
                const body = lines.slice(1).join("\n").trim();

                return (
                  <div key={c.sha} className={`flex flex-col ${!isLast ? "border-b border-base-300" : ""}`}>
                    <div className="flex items-start gap-3 px-4 py-3">
                      {/* Avatar */}
                      <div className="shrink-0 mt-0.5">
                        {c.author?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.author.avatar_url} alt={c.author.login} className="w-6 h-6 rounded-full" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-base-300 flex items-center justify-center text-xs">
                            {c.commit.author.name[0]}
                          </div>
                        )}
                      </div>

                      {/* Message + meta */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 flex-wrap">
                          <p className="text-sm font-medium text-base-content leading-snug flex-1">
                            {title}
                          </p>
                          {body && (
                            <button
                              onClick={() => setExpandedSha(isExpanded ? null : c.sha)}
                              className="btn btn-xs btn-ghost shrink-0 px-1"
                              title="Show full message"
                            >
                              <ChevronDown size={12} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-base-content/40 flex-wrap">
                          <span className="font-medium">
                            {c.author?.login ?? c.commit.author.name}
                          </span>
                          <span>committed</span>
                          <span title={c.commit.author.date}>{timeAgo(c.commit.author.date)}</span>
                        </div>
                      </div>

                      {/* SHA + link */}
                      <div className="flex items-center gap-1 shrink-0">
                        <code className="text-xs font-mono text-base-content/40 bg-base-300 px-1.5 py-0.5 rounded">
                          {c.sha.slice(0, 7)}
                        </code>
                        <a
                          href={c.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-xs btn-ghost px-1"
                          title="View on GitHub"
                        >
                          <ExternalLink size={11} />
                        </a>
                      </div>
                    </div>

                    {/* Expanded body */}
                    {isExpanded && body && (
                      <div className="px-4 pb-3 pl-13">
                        <pre className="text-xs text-base-content/60 bg-base-300 rounded p-3 whitespace-pre-wrap font-mono leading-relaxed ml-9">
                          {body}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="btn btn-ghost btn-sm w-full border border-base-300"
        >
          {loadingMore ? <span className="loading loading-spinner loading-xs" /> : <ChevronDown size={14} />}
          Load more commits
        </button>
      )}
    </div>
  );
}
