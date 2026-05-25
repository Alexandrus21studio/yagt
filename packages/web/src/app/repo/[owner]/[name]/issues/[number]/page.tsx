"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, CheckCircle, MessageSquare, Bot, ArrowLeft } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface GHLabel { name: string; color: string }
interface GHUser { login: string; avatar_url: string }
interface GHIssue {
  number: number;
  title: string;
  state: "open" | "closed";
  user: GHUser;
  labels: GHLabel[];
  body: string | null;
  created_at: string;
  updated_at: string;
  comments: number;
  html_url: string;
}
interface GHComment {
  id: number;
  user: GHUser;
  body: string;
  created_at: string;
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

export default function IssueDetailPage() {
  const { owner, name, number } = useParams<{ owner: string; name: string; number: string }>();

  const [issue, setIssue] = useState<GHIssue | null>(null);
  const [comments, setComments] = useState<GHComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commenting, setCommenting] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [stateLoading, setStateLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [issueRes, commentsRes] = await Promise.all([
        fetch(`/api/github/repos/${owner}/${name}/issues/${number}`),
        fetch(`/api/github/repos/${owner}/${name}/issues/${number}/comments`),
      ]);
      const issueData = await issueRes.json();
      const commentsData = await commentsRes.json();
      if (issueData.message) { setError(issueData.message); return; }
      setIssue(issueData);
      setComments(Array.isArray(commentsData) ? commentsData : []);
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
        setIssue((prev) => prev ? { ...prev, comments: prev.comments + 1 } : prev);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleState() {
    if (!issue) return;
    setStateLoading(true);
    const newState = issue.state === "open" ? "closed" : "open";
    try {
      const res = await fetch(`/api/github/repos/${owner}/${name}/issues/${number}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: newState }),
      });
      const data = await res.json();
      if (data.number) setIssue(data);
    } finally {
      setStateLoading(false);
    }
  }

  if (loading) return (
    <div className="flex items-center gap-3 text-base-content/40 text-sm py-20 justify-center">
      <span className="loading loading-spinner loading-sm" /> Loading issue...
    </div>
  );

  if (error) return (
    <div className="max-w-3xl">
      <div className="alert alert-error">{error}</div>
    </div>
  );

  if (!issue) return null;

  return (
    <div className="flex flex-col gap-4 max-w-4xl w-full">
      {/* Back + breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-base-content/50 flex-wrap">
        <Link href={`/repo/${owner}/${name}/issues`} className="flex items-center gap-1 hover:text-primary transition-colors">
          <ArrowLeft size={14} /> Issues
        </Link>
        <span>/</span>
        <span className="text-base-content">#{issue.number}</span>
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

      {/* Issue header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold leading-snug">
          {issue.title}
          <span className="text-base-content/40 font-normal ml-2">#{issue.number}</span>
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`badge gap-1.5 ${issue.state === "open" ? "badge-success" : "badge-ghost"}`}>
            {issue.state === "open"
              ? <AlertCircle size={12} />
              : <CheckCircle size={12} />}
            {issue.state}
          </span>
          {issue.labels.map((l) => (
            <span key={l.name} className="badge badge-sm font-normal"
              style={{ background: `#${l.color}22`, color: `#${l.color}`, borderColor: `#${l.color}44` }}>
              {l.name}
            </span>
          ))}
        </div>
      </div>

      {/* Main content + sidebar */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left: body + comments */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Issue body */}
          <div className="card card-bordered bg-base-200">
            <div className="card-body p-4">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-base-300">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={issue.user.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                <span className="text-sm font-medium">{issue.user.login}</span>
                <span className="text-xs text-base-content/40">opened {timeAgo(issue.created_at)}</span>
              </div>
              {issue.body ? (
                <div className="prose prose-sm max-w-none prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{issue.body}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-base-content/40 italic">No description provided.</p>
              )}
            </div>
          </div>

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
                  <button className="btn btn-sm btn-ghost" onClick={() => { setCommenting(false); setCommentBody(""); }}>
                    Cancel
                  </button>
                  <button className="btn btn-sm btn-primary" onClick={submitComment} disabled={submitting || !commentBody.trim()}>
                    {submitting ? <span className="loading loading-spinner loading-xs" /> : null}
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
                  <img src={issue.user.avatar_url} alt="" className="w-5 h-5 rounded-full" />
                  <span className="text-sm">{issue.user.login}</span>
                </div>
              </div>
              {issue.labels.length > 0 && (
                <div>
                  <p className="text-xs text-base-content/40 uppercase font-semibold mb-1">Labels</p>
                  <div className="flex flex-wrap gap-1">
                    {issue.labels.map((l) => (
                      <span key={l.name} className="badge badge-xs font-normal"
                        style={{ background: `#${l.color}22`, color: `#${l.color}`, borderColor: `#${l.color}44` }}>
                        {l.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-base-content/40 uppercase font-semibold mb-1">Comments</p>
                <p className="text-sm">{issue.comments}</p>
              </div>
              <div className="flex flex-col gap-2 pt-1 border-t border-base-300">
                <button
                  className={`btn btn-sm w-full ${issue.state === "open" ? "btn-error btn-outline" : "btn-success btn-outline"}`}
                  onClick={toggleState}
                  disabled={stateLoading}
                >
                  {stateLoading ? <span className="loading loading-spinner loading-xs" /> : null}
                  {issue.state === "open" ? "Close issue" : "Reopen issue"}
                </button>
                <Link href={`/repo/${owner}/${name}/ai?issue=${number}`}
                  className="btn btn-sm btn-ghost border border-base-300 gap-1 w-full">
                  <Bot size={13} /> Ask AI
                </Link>
                <a href={issue.html_url} target="_blank" rel="noopener noreferrer"
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
