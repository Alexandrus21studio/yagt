"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { GitPullRequest, CheckCircle, XCircle, MessageSquare, GitMerge, ArrowLeft, FileDiff } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface GHLabel { name: string; color: string }
interface GHUser { login: string; avatar_url: string }
interface GHPR {
  number: number;
  title: string;
  state: "open" | "closed";
  draft: boolean;
  merged_at: string | null;
  user: GHUser;
  labels: GHLabel[];
  body: string | null;
  created_at: string;
  head: { ref: string };
  base: { ref: string };
  additions: number;
  deletions: number;
  changed_files: number;
  commits: number;
  mergeable: boolean | null;
  html_url: string;
}
interface GHComment {
  id: number;
  user: GHUser;
  body: string;
  created_at: string;
}
interface GHFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function PRStatusBadge({ pr }: { pr: GHPR }) {
  if (pr.merged_at) return <span className="badge gap-1.5" style={{ background: "#8250df22", color: "#8250df", borderColor: "#8250df44" }}><GitMerge size={12} /> merged</span>;
  if (pr.state === "closed") return <span className="badge badge-error gap-1.5"><XCircle size={12} /> closed</span>;
  if (pr.draft) return <span className="badge badge-ghost gap-1.5"><GitPullRequest size={12} /> draft</span>;
  return <span className="badge badge-success gap-1.5"><GitPullRequest size={12} /> open</span>;
}

export default function PRDetailPage() {
  const { owner, name, number } = useParams<{ owner: string; name: string; number: string }>();

  const [pr, setPR] = useState<GHPR | null>(null);
  const [comments, setComments] = useState<GHComment[]>([]);
  const [files, setFiles] = useState<GHFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commenting, setCommenting] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [showFiles, setShowFiles] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [prRes, commentsRes, filesRes] = await Promise.all([
        fetch(`/api/github/repos/${owner}/${name}/pulls/${number}`),
        fetch(`/api/github/repos/${owner}/${name}/issues/${number}/comments`),
        fetch(`/api/github/repos/${owner}/${name}/pulls/${number}/files`),
      ]);
      const prData = await prRes.json();
      const commentsData = await commentsRes.json();
      const filesData = await filesRes.json();
      if (prData.message) { setError(prData.message); return; }
      setPR(prData);
      setComments(Array.isArray(commentsData) ? commentsData : []);
      setFiles(Array.isArray(filesData) ? filesData : []);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [owner, name, number]);

  async function submitComment() {
    if (!commentBody.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/github/repos/${owner}/${name}/issues/${number}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: commentBody }),
      });
      const data = await res.json();
      if (data.id) {
        setComments((prev) => [...prev, data]);
        setCommentBody("");
        setCommenting(false);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function mergePR() {
    setActionLoading(true);
    setActionMsg(null);
    try {
      const res = await fetch(`/api/github/repos/${owner}/${name}/pulls/${number}/merge`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merge_method: "merge" }),
      });
      const data = await res.json();
      if (data.merged) {
        setActionMsg("Pull request merged successfully.");
        await load();
      } else {
        setActionMsg(data.message ?? "Merge failed.");
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function toggleState() {
    if (!pr) return;
    setActionLoading(true);
    setActionMsg(null);
    const newState = pr.state === "open" ? "closed" : "open";
    try {
      const res = await fetch(`/api/github/repos/${owner}/${name}/pulls/${number}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: newState }),
      });
      const data = await res.json();
      if (data.number) setPR(data);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return (
    <div className="flex items-center gap-3 text-base-content/40 text-sm py-20 justify-center">
      <span className="loading loading-spinner loading-sm" /> Loading pull request...
    </div>
  );

  if (error) return <div className="max-w-3xl"><div className="alert alert-error">{error}</div></div>;
  if (!pr) return null;

  const canMerge = pr.state === "open" && !pr.draft && !pr.merged_at;

  return (
    <div className="flex flex-col gap-4 max-w-4xl w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-base-content/50 flex-wrap">
        <Link href={`/repo/${owner}/${name}/pulls`} className="flex items-center gap-1 hover:text-primary transition-colors">
          <ArrowLeft size={14} /> Pull Requests
        </Link>
        <span>/</span>
        <span className="text-base-content">#{pr.number}</span>
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
            className={`tab whitespace-nowrap${t.label === "Pull requests" ? " tab-active" : ""}`}>
            {t.label}
          </Link>
        ))}
      </div>

      {/* PR header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold leading-snug">
          {pr.title}
          {pr.draft && <span className="badge badge-ghost badge-sm ml-2 align-middle">Draft</span>}
          <span className="text-base-content/40 font-normal ml-2">#{pr.number}</span>
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <PRStatusBadge pr={pr} />
          <span className="text-sm text-base-content/50 font-mono">{pr.head.ref} → {pr.base.ref}</span>
          {pr.labels.map((l) => (
            <span key={l.name} className="badge badge-sm font-normal"
              style={{ background: `#${l.color}22`, color: `#${l.color}`, borderColor: `#${l.color}44` }}>
              {l.name}
            </span>
          ))}
        </div>
      </div>

      {actionMsg && <div className="alert alert-info text-sm py-2">{actionMsg}</div>}

      {/* Main + sidebar */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left column */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* PR body */}
          <div className="card card-bordered bg-base-200">
            <div className="card-body p-4">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-base-300">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pr.user.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                <span className="text-sm font-medium">{pr.user.login}</span>
                <span className="text-xs text-base-content/40">opened {timeAgo(pr.created_at)}</span>
              </div>
              {pr.body ? (
                <div className="prose prose-sm max-w-none prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{pr.body}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-base-content/40 italic">No description provided.</p>
              )}
            </div>
          </div>

          {/* Files changed */}
          {files.length > 0 && (
            <div className="card card-bordered bg-base-200">
              <button
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-base-300/50 transition-colors w-full text-left"
                onClick={() => setShowFiles(!showFiles)}
              >
                <FileDiff size={14} className="text-base-content/50" />
                {files.length} files changed
                <span className="text-success text-xs">+{pr.additions}</span>
                <span className="text-error text-xs">-{pr.deletions}</span>
                <span className="ml-auto text-base-content/40">{showFiles ? "▲" : "▼"}</span>
              </button>
              {showFiles && (
                <div className="border-t border-base-300">
                  {files.map((f) => (
                    <div key={f.filename} className="flex items-center gap-2 px-4 py-2 text-xs border-b border-base-300/50 last:border-0 flex-wrap">
                      <span className={`badge badge-xs ${f.status === "added" ? "badge-success" : f.status === "removed" ? "badge-error" : "badge-ghost"}`}>
                        {f.status[0].toUpperCase()}
                      </span>
                      <span className="font-mono flex-1 truncate">{f.filename}</span>
                      <span className="text-success shrink-0">+{f.additions}</span>
                      <span className="text-error shrink-0">-{f.deletions}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Comments */}
          {comments.map((c) => (
            <div key={c.id} className="card card-bordered bg-base-200">
              <div className="card-body p-4">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-base-300">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.user.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                  <span className="text-sm font-medium">{c.user.login}</span>
                  <span className="text-xs text-base-content/40">{timeAgo(c.created_at)}</span>
                </div>
                <div className="prose prose-sm max-w-none prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{c.body}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}

          {/* Add comment */}
          {commenting ? (
            <div className="card card-bordered bg-base-200">
              <div className="card-body p-4 gap-3">
                <textarea
                  className="textarea textarea-bordered w-full bg-base-100 text-sm resize-none"
                  rows={5}
                  placeholder="Leave a comment..."
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                />
                <div className="flex gap-2 justify-end">
                  <button className="btn btn-sm btn-ghost" onClick={() => { setCommenting(false); setCommentBody(""); }}>Cancel</button>
                  <button className="btn btn-sm btn-primary" onClick={submitComment} disabled={submitting || !commentBody.trim()}>
                    {submitting && <span className="loading loading-spinner loading-xs" />}
                    Comment
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button className="btn btn-sm btn-ghost border border-base-300 gap-2 self-start" onClick={() => setCommenting(true)}>
              <MessageSquare size={14} /> Add comment
            </button>
          )}
        </div>

        {/* Right sidebar */}
        <div className="w-full lg:w-56 shrink-0 flex flex-col gap-3">
          <div className="card card-bordered bg-base-200">
            <div className="card-body p-3 gap-3">
              <div>
                <p className="text-xs text-base-content/40 uppercase font-semibold mb-1">Author</p>
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pr.user.avatar_url} alt="" className="w-5 h-5 rounded-full" />
                  <span className="text-sm">{pr.user.login}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-base-content/40 uppercase font-semibold mb-1">Stats</p>
                <div className="text-xs space-y-0.5">
                  <p><span className="text-success">+{pr.additions}</span> additions</p>
                  <p><span className="text-error">-{pr.deletions}</span> deletions</p>
                  <p>{pr.changed_files} files changed</p>
                  <p>{pr.commits} commit{pr.commits !== 1 ? "s" : ""}</p>
                </div>
              </div>
              {pr.labels.length > 0 && (
                <div>
                  <p className="text-xs text-base-content/40 uppercase font-semibold mb-1">Labels</p>
                  <div className="flex flex-wrap gap-1">
                    {pr.labels.map((l) => (
                      <span key={l.name} className="badge badge-xs font-normal"
                        style={{ background: `#${l.color}22`, color: `#${l.color}`, borderColor: `#${l.color}44` }}>
                        {l.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-2 pt-1 border-t border-base-300">
                {canMerge && (
                  <button
                    className="btn btn-sm btn-success w-full gap-1"
                    onClick={mergePR}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <span className="loading loading-spinner loading-xs" /> : <GitMerge size={13} />}
                    Merge PR
                  </button>
                )}
                {!pr.merged_at && (
                  <button
                    className={`btn btn-sm w-full ${pr.state === "open" ? "btn-error btn-outline" : "btn-success btn-outline"}`}
                    onClick={toggleState}
                    disabled={actionLoading}
                  >
                    {actionLoading && <span className="loading loading-spinner loading-xs" />}
                    {pr.state === "open" ? "Close PR" : "Reopen PR"}
                  </button>
                )}
                <a href={pr.html_url} target="_blank" rel="noopener noreferrer"
                  className="btn btn-sm btn-ghost border border-base-300 w-full text-xs">
                  View on GitHub ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
