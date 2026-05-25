"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, CheckCircle, Clock, Search, Tag, MessageSquare } from "lucide-react";
import Link from "next/link";

interface GHLabel { name: string; color: string }
interface GHIssue {
  number: number;
  title: string;
  user: { login: string; avatar_url: string };
  labels: GHLabel[];
  comments: number;
  created_at: string;
  state: "open" | "closed";
  body: string | null;
}

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

export default function IssuesPage() {
  const params = useParams<{ owner: string; name: string }>();
  const { owner, name } = params;

  const [issues, setIssues] = useState<GHIssue[]>([]);
  const [filter, setFilter] = useState<"open" | "closed">("open");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/github/repos/${owner}/${name}/issues?state=${filter}&per_page=50`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setIssues(data);
        else setError(data.message ?? "Failed to load issues");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [owner, name, filter]);

  const filtered = issues.filter((i) =>
    !search || i.title.toLowerCase().includes(search.toLowerCase())
  );
  const open = issues.filter((i) => i.state === "open").length;
  const closed = issues.filter((i) => i.state === "closed").length;

  return (
    <div className="flex flex-col gap-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-lg font-semibold">
          <Link href={`/repo/${owner}/${name}`} className="text-primary">{owner}/{name}</Link>
          <span className="text-base-content/40 font-normal"> · Issues</span>
        </h1>
        <button className="btn btn-sm btn-primary">New issue</button>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-bordered overflow-x-auto flex-nowrap gap-0">
        {[
          { label: "Code", href: "" },
          { label: "Issues", href: "/issues" },
          { label: "Pull requests", href: "/pulls" },
          { label: "AI Assistant", href: "/ai" },
        ].map((t) => (
          <Link key={t.label} href={`/repo/${owner}/${name}${t.href}`}
            className={`tab whitespace-nowrap${t.label === "Issues" ? " tab-active" : ""}`}>
            {t.label}
          </Link>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 pointer-events-none" />
          <input
            type="text"
            placeholder="Search issues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input input-bordered input-sm w-full pl-8 bg-base-100"
          />
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => setFilter("open")}
            className={`btn btn-sm gap-1.5 ${filter === "open" ? "btn-active" : "btn-ghost"}`}
          >
            <AlertCircle size={13} className="text-success" /> {open} Open
          </button>
          <button
            onClick={() => setFilter("closed")}
            className={`btn btn-sm gap-1.5 ${filter === "closed" ? "btn-active" : "btn-ghost"}`}
          >
            <CheckCircle size={13} /> {closed} Closed
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error text-sm">{error}</div>}

      {loading ? (
        <div className="flex items-center gap-3 text-base-content/40 text-sm py-10 justify-center">
          <span className="loading loading-spinner loading-sm" /> Loading issues...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card card-bordered bg-base-200">
          <div className="card-body items-center text-center py-16">
            <AlertCircle size={36} className="text-base-content/20 mb-2" />
            <p className="font-medium">{search ? "No issues match your search." : `No ${filter} issues.`}</p>
            <p className="text-sm text-base-content/40">
              {filter === "open" ? "All clear!" : "Try switching to open issues."}
            </p>
          </div>
        </div>
      ) : (
        <div className="card card-bordered bg-base-200 overflow-hidden">
          <div className="flex items-center gap-4 px-4 py-2.5 bg-base-300/50 border-b border-base-300 text-sm text-base-content/50">
            <span>{filtered.length} {filter} issue{filtered.length !== 1 ? "s" : ""}</span>
            <span className="flex items-center gap-1 ml-auto"><Tag size={12} /> Label</span>
          </div>
          {filtered.map((issue, i) => (
            <div
              key={issue.number}
              className={`flex gap-3 px-4 py-3 hover:bg-base-300/50 transition-colors ${i < filtered.length - 1 ? "border-b border-base-300/60" : ""}`}
            >
              {/* Status icon */}
              <div className="pt-0.5 shrink-0">
                {issue.state === "open"
                  ? <AlertCircle size={16} className="text-success" />
                  : <CheckCircle size={16} className="text-base-content/30" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <span className="font-medium text-sm text-base-content leading-snug flex-1">
                    {issue.title}
                  </span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {issue.labels.map((l) => (
                      <span key={l.name} className="badge badge-sm font-normal"
                        style={{ background: `#${l.color}22`, color: `#${l.color}`, borderColor: `#${l.color}44` }}>
                        {l.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-base-content/40 flex-wrap">
                  <span>#{issue.number}</span>
                  <span>opened {timeAgo(issue.created_at)} by</span>
                  <span className="flex items-center gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={issue.user.avatar_url} alt="" className="w-3.5 h-3.5 rounded-full" />
                    {issue.user.login}
                  </span>
                  {issue.comments > 0 && (
                    <span className="flex items-center gap-1 ml-auto">
                      <MessageSquare size={11} /> {issue.comments}
                    </span>
                  )}
                  <Link href={`/repo/${owner}/${name}/ai?issue=${issue.number}`}
                    className="text-primary hover:underline ml-auto sm:ml-0">
                    Ask AI →
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
