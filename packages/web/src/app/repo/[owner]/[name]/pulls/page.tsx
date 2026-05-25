"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { GitPullRequest, CheckCircle, XCircle, Search, MessageSquare, X, GitBranch } from "lucide-react";
import Link from "next/link";

interface GHLabel { name: string; color: string }
interface GHPR {
  number: number;
  title: string;
  user: { login: string; avatar_url: string };
  labels: GHLabel[];
  comments: number;
  created_at: string;
  state: "open" | "closed";
  draft: boolean;
  merged_at: string | null;
  head: { ref: string };
  base: { ref: string };
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

function PRIcon({ pr }: { pr: GHPR }) {
  if (pr.merged_at) return <GitPullRequest size={16} className="text-purple-400" />;
  if (pr.state === "closed") return <XCircle size={16} className="text-error" />;
  if (pr.draft) return <GitPullRequest size={16} className="text-base-content/30" />;
  return <GitPullRequest size={16} className="text-success" />;
}

export default function PullsPage() {
  const params = useParams<{ owner: string; name: string }>();
  const { owner, name } = params;

  const [prs, setPRs] = useState<GHPR[]>([]);
  const [filter, setFilter] = useState<"open" | "closed">("open");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New PR modal
  const [showModal, setShowModal] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newHead, setNewHead] = useState("");
  const [newBase, setNewBase] = useState("");
  const [newDraft, setNewDraft] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  function loadPRs() {
    setLoading(true);
    setError(null);
    fetch(`/api/github/repos/${owner}/${name}/pulls?state=${filter}&per_page=50`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPRs(data);
        else setError(data.message ?? "Failed to load pull requests");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadPRs(); }, [owner, name, filter]);

  async function openModal() {
    setShowModal(true);
    setBranchesLoading(true);
    try {
      const res = await fetch(`/api/github/repos/${owner}/${name}/branches?per_page=100`);
      const data = await res.json();
      const names: string[] = Array.isArray(data) ? data.map((b: { name: string }) => b.name) : [];
      setBranches(names);
      const defaultBase = names.includes("main") ? "main" : names.includes("master") ? "master" : names[0] ?? "";
      setNewBase(defaultBase);
      setNewHead(names.find((b) => b !== defaultBase) ?? names[0] ?? "");
    } catch {
      setBranches([]);
    } finally {
      setBranchesLoading(false);
    }
  }

  async function createPR() {
    if (!newTitle.trim() || !newHead || !newBase) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch(`/api/github/repos/${owner}/${name}/pulls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, body: newBody, head: newHead, base: newBase, draft: newDraft }),
      });
      const data = await res.json();
      if (data.number) {
        setPRs((prev) => [data, ...prev]);
        setShowModal(false);
        setNewTitle(""); setNewBody(""); setNewDraft(false);
        setFilter("open");
      } else {
        setCreateError(data.message ?? "Failed to create pull request");
      }
    } catch {
      setCreateError("Network error");
    } finally {
      setCreating(false);
    }
  }

  const filtered = prs.filter((p) =>
    !search || p.title.toLowerCase().includes(search.toLowerCase())
  );
  const open = prs.filter((p) => p.state === "open").length;
  const closed = prs.filter((p) => p.state === "closed").length;

  return (
    <div className="flex flex-col gap-4 max-w-5xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-lg font-semibold">
          <Link href={`/repo/${owner}/${name}`} className="text-primary">{owner}/{name}</Link>
          <span className="text-base-content/40 font-normal"> · Pull Requests</span>
        </h1>
        <button className="btn btn-sm btn-primary" onClick={openModal}>New pull request</button>
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 pointer-events-none" />
          <input
            type="text"
            placeholder="Search pull requests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input input-bordered input-sm w-full pl-8 bg-base-100"
          />
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => setFilter("open")}
            className={`btn btn-sm gap-1.5 ${filter === "open" ? "btn-active" : "btn-ghost"}`}>
            <GitPullRequest size={13} className="text-success" /> {open} Open
          </button>
          <button onClick={() => setFilter("closed")}
            className={`btn btn-sm gap-1.5 ${filter === "closed" ? "btn-active" : "btn-ghost"}`}>
            <CheckCircle size={13} /> {closed} Closed
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error text-sm">{error}</div>}

      {loading ? (
        <div className="flex items-center gap-3 text-base-content/40 text-sm py-10 justify-center">
          <span className="loading loading-spinner loading-sm" /> Loading pull requests...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card card-bordered bg-base-200">
          <div className="card-body items-center text-center py-16">
            <GitPullRequest size={36} className="text-base-content/20 mb-2" />
            <p className="font-medium">{search ? "No PRs match your search." : `No ${filter} pull requests.`}</p>
          </div>
        </div>
      ) : (
        <div className="card card-bordered bg-base-200 overflow-hidden">
          <div className="flex items-center gap-4 px-4 py-2.5 bg-base-300/50 border-b border-base-300 text-sm text-base-content/50">
            <span>{filtered.length} {filter} pull request{filtered.length !== 1 ? "s" : ""}</span>
          </div>
          {filtered.map((pr, i) => (
            <div
              key={pr.number}
              className={`flex gap-3 px-4 py-3 hover:bg-base-300/50 transition-colors ${i < filtered.length - 1 ? "border-b border-base-300/60" : ""}`}
            >
              <div className="pt-0.5 shrink-0"><PRIcon pr={pr} /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <Link
                    href={`/repo/${owner}/${name}/pulls/${pr.number}`}
                    className="font-medium text-sm text-base-content leading-snug flex-1 hover:text-primary transition-colors"
                  >
                    {pr.title}
                    {pr.draft && <span className="badge badge-ghost badge-xs ml-2 align-middle">Draft</span>}
                  </Link>
                  <div className="flex items-center gap-1">
                    {pr.labels.map((l) => (
                      <span key={l.name} className="badge badge-sm font-normal"
                        style={{ background: `#${l.color}22`, color: `#${l.color}`, borderColor: `#${l.color}44` }}>
                        {l.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-base-content/40 flex-wrap">
                  <span>#{pr.number}</span>
                  <span>{pr.merged_at ? "merged" : "opened"} {timeAgo(pr.merged_at ?? pr.created_at)} by</span>
                  <span className="flex items-center gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pr.user.avatar_url} alt="" className="w-3.5 h-3.5 rounded-full" />
                    {pr.user.login}
                  </span>
                  <span className="font-mono text-xs hidden sm:inline">
                    {pr.head.ref} → {pr.base.ref}
                  </span>
                  {pr.comments > 0 && (
                    <span className="flex items-center gap-1 ml-auto">
                      <MessageSquare size={11} /> {pr.comments}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New PR Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-base-100 border border-base-300 rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
              <h2 className="font-semibold text-sm">New Pull Request</h2>
              <button className="btn btn-ghost btn-xs btn-circle" onClick={() => { setShowModal(false); setCreateError(null); }}>
                <X size={14} />
              </button>
            </div>
            <div className="flex flex-col gap-3 p-4 overflow-y-auto">
              {branchesLoading ? (
                <div className="flex items-center gap-2 text-sm text-base-content/40 py-4 justify-center">
                  <span className="loading loading-spinner loading-xs" /> Loading branches...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-base-content/50 mb-1 block flex items-center gap-1">
                        <GitBranch size={11} /> Base branch
                      </label>
                      <select className="select select-bordered select-sm w-full bg-base-100"
                        value={newBase} onChange={(e) => setNewBase(e.target.value)}>
                        {branches.map((b) => <option key={b}>{b}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-base-content/50 mb-1 block flex items-center gap-1">
                        <GitBranch size={11} /> Head branch
                      </label>
                      <select className="select select-bordered select-sm w-full bg-base-100"
                        value={newHead} onChange={(e) => setNewHead(e.target.value)}>
                        {branches.map((b) => <option key={b}>{b}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-base-content/50 mb-1 block">Title <span className="text-error">*</span></label>
                    <input
                      type="text"
                      className="input input-bordered input-sm w-full bg-base-100"
                      placeholder="Pull request title"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-xs text-base-content/50 mb-1 block">Description</label>
                    <textarea
                      className="textarea textarea-bordered w-full bg-base-100 text-sm resize-none"
                      rows={4}
                      placeholder="Describe your changes... (markdown supported)"
                      value={newBody}
                      onChange={(e) => setNewBody(e.target.value)}
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" className="checkbox checkbox-sm"
                      checked={newDraft} onChange={(e) => setNewDraft(e.target.checked)} />
                    Create as draft
                  </label>
                </>
              )}
              {createError && <div className="alert alert-error text-xs py-2">{createError}</div>}
            </div>
            <div className="flex gap-2 justify-end px-4 pb-4 border-t border-base-300 pt-3">
              <button className="btn btn-sm btn-ghost" onClick={() => { setShowModal(false); setCreateError(null); }}>Cancel</button>
              <button
                className="btn btn-sm btn-primary"
                onClick={createPR}
                disabled={creating || !newTitle.trim() || !newHead || !newBase || branchesLoading}
              >
                {creating && <span className="loading loading-spinner loading-xs" />}
                Create pull request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
