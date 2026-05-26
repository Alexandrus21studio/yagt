"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Star, GitFork, Eye, Folder, FileText, Clock,
  Download, Copy, Check, Edit3, Save, X, ChevronRight,
  Sparkles, ArrowLeft, GitCommit, AlertCircle, GitBranch, Code2
} from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface GHRepo {
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  watchers_count: number;
  default_branch: string;
  language: string | null;
  private: boolean;
  clone_url: string;
  ssh_url: string;
  html_url: string;
  topics: string[];
  license: { spdx_id: string; name: string } | null;
  homepage: string | null;
  created_at: string;
  pushed_at: string;
  size: number;
}

interface GHContent {
  name: string;
  type: "file" | "dir";
  path: string;
  size?: number;
  sha?: string;
  content?: string;
  encoding?: string;
}

interface GHCommit {
  sha: string;
  commit: { message: string; author: { date: string; name: string } };
  author: { login: string; avatar_url: string } | null;
  html_url: string;
}

const langColor: Record<string, string> = {
  TypeScript: "#3178c6", Rust: "#dea584", Go: "#00add8",
  Python: "#3572a5", JavaScript: "#f0db4f", "C++": "#f34b7d",
  Ruby: "#701516", Swift: "#fa7343", Kotlin: "#a97bff", Java: "#b07219",
  Shell: "#89e051", HTML: "#e34c26", CSS: "#563d7c", C: "#555555",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} minutes ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hours ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

function formatSize(kb: number) {
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function RepoPage() {
  const params = useParams<{ owner: string; name: string }>();
  const { owner, name } = params;

  const [repo, setRepo] = useState<GHRepo | null>(null);
  const [files, setFiles] = useState<GHContent[]>([]);
  const [commits, setCommits] = useState<GHCommit[]>([]);
  const [readme, setReadme] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starred, setStarred] = useState(false);

  const [viewingFile, setViewingFile] = useState<GHContent | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [fileLoading, setFileLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [commitMsg, setCommitMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [showCode, setShowCode] = useState(false);
  const [cloneTab, setCloneTab] = useState<"https" | "ssh" | "cli">("https");
  const [copied, setCopied] = useState(false);
  const [forking, setForking] = useState(false);
  const [forkDone, setForkDone] = useState(false);

  const fetchContents = useCallback((path: string) => {
    const ep = path ? `/api/github/repos/${owner}/${name}/contents/${path}` : `/api/github/repos/${owner}/${name}/contents`;
    return fetch(ep).then((r) => r.json());
  }, [owner, name]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/github/repos/${owner}/${name}`).then((r) => r.json()),
      fetchContents(""),
      fetch(`/api/github/repos/${owner}/${name}/commits?per_page=10`).then((r) => r.json()),
      fetch(`/api/github/repos/${owner}/${name}/readme`)
        .then((r) => r.json())
        .then((d) => d.content ? atob(d.content.replace(/\n/g, "")) : null)
        .catch(() => null),
    ]).then(([rd, cd, comd, rm]) => {
      if (rd.message) { setError(rd.message); return; }
      setRepo(rd);
      if (Array.isArray(cd)) setFiles(cd.sort((a: GHContent, b: GHContent) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
      if (Array.isArray(comd)) setCommits(comd);
      setReadme(rm);
    }).catch(() => setError("Network error")).finally(() => setLoading(false));
  }, [owner, name, fetchContents]);

  function navigateTo(path: string) {
    setCurrentPath(path);
    setViewingFile(null);
    setEditMode(false);
    fetchContents(path).then((data) => {
      if (Array.isArray(data)) setFiles(data.sort((a: GHContent, b: GHContent) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
    });
  }

  async function openFile(f: GHContent) {
    if (f.type === "dir") { navigateTo(f.path); return; }
    setViewingFile(f);
    setEditMode(false);
    setSaveError(null);
    setFileLoading(true);
    try {
      const data: GHContent = await fetch(`/api/github/repos/${owner}/${name}/contents/${f.path}`).then((r) => r.json());
      if (data.content && data.encoding === "base64") {
        setFileContent(atob(data.content.replace(/\n/g, "")));
        setViewingFile({ ...f, sha: data.sha });
      } else setFileContent("(Binary file)");
    } catch { setFileContent("Failed to load."); } finally { setFileLoading(false); }
  }

  async function saveFile() {
    if (!viewingFile?.sha || !commitMsg.trim()) return;
    setSaving(true); setSaveError(null);
    try {
      const encoded = btoa(unescape(encodeURIComponent(editContent)));
      const res = await fetch(`/api/github/repos/${owner}/${name}/contents/${viewingFile.path}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: commitMsg, content: encoded, sha: viewingFile.sha }),
      });
      const data = await res.json();
      if (data.content) {
        setFileContent(editContent);
        setViewingFile({ ...viewingFile, sha: data.content.sha });
        setEditMode(false);
        fetch(`/api/github/repos/${owner}/${name}/commits?per_page=10`).then((r) => r.json()).then((d) => Array.isArray(d) && setCommits(d));
      } else setSaveError(data.message ?? "Save failed — check token permissions.");
    } catch { setSaveError("Network error."); } finally { setSaving(false); }
  }

  async function forkRepo() {
    setForking(true);
    const res = await fetch(`/api/github/repos/${owner}/${name}/forks`, { method: "POST" });
    const data = await res.json();
    setForking(false);
    if (data.full_name) setForkDone(true);
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  if (loading) return (
    <div className="flex justify-center items-center h-52">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  );
  if (error) return <div className="alert alert-error text-sm">{error}</div>;

  const pathParts = currentPath ? currentPath.split("/") : [];
  const lastCommit = commits[0];
  const cloneUrl = cloneTab === "https" ? repo?.clone_url : cloneTab === "ssh" ? repo?.ssh_url : `gh repo clone ${owner}/${name}`;

  return (
    <div className="flex flex-col">

      {/* ── Repo header ── */}
      <div className="flex flex-col gap-2 mb-4">
        {/* Breadcrumb + badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Code2 size={16} className="text-base-content/60" />
          <div className="flex items-center gap-1 text-xl font-light">
            <Link href="/" className="text-primary hover:underline font-normal">{owner}</Link>
            <span className="text-base-content/60">/</span>
            <Link href={`/repo/${owner}/${name}`} className="text-primary hover:underline font-bold">{name}</Link>
          </div>
          <span className="badge badge-sm badge-outline text-base-content/60">
            {repo?.private ? "Private" : "Public"}
          </span>
        </div>

        {/* Watch / Star / Fork buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button className="join btn btn-sm btn-outline p-0 overflow-hidden min-h-[44px] sm:min-h-0">
            <span className="join-item flex items-center gap-1 px-3 py-1 border-r border-base-300">
              <Eye size={14} /> Watch
            </span>
            <span className="join-item px-2.5 py-1">{repo?.watchers_count?.toLocaleString()}</span>
          </button>

          <button
            onClick={() => setStarred((v) => !v)}
            className="join btn btn-sm btn-outline p-0 overflow-hidden min-h-[44px] sm:min-h-0"
          >
            <span className={`join-item flex items-center gap-1 px-3 py-1 border-r border-base-300 ${starred ? "text-warning" : ""}`}>
              <Star size={14} fill={starred ? "#e3b341" : "none"} /> {starred ? "Starred" : "Star"}
            </span>
            <span className="join-item px-2.5 py-1">{((repo?.stargazers_count ?? 0) + (starred ? 1 : 0)).toLocaleString()}</span>
          </button>

          <button
            onClick={forkRepo}
            disabled={forking}
            className={`join btn btn-sm p-0 overflow-hidden min-h-[44px] sm:min-h-0 ${forkDone ? "btn-success btn-outline" : "btn-outline"}`}
          >
            <span className={`join-item flex items-center gap-1 px-3 py-1 border-r ${forkDone ? "border-success" : "border-base-300"}`}>
              <GitFork size={14} /> {forkDone ? "Forked!" : "Fork"}
            </span>
            <span className="join-item px-2.5 py-1">{repo?.forks_count?.toLocaleString()}</span>
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="tabs tabs-bordered overflow-x-auto flex-nowrap gap-0 mb-4">
        {[
          { label: "Code", href: "", icon: <Code2 size={14} />, active: true },
          { label: "Issues", href: "/issues", icon: <AlertCircle size={14} />, count: repo?.open_issues_count },
          { label: "Pull requests", href: "/pulls", icon: <GitBranch size={14} /> },
          { label: "Commits", href: "/commits", icon: <GitCommit size={14} /> },
          { label: "AI Assistant", href: "/ai", icon: <Sparkles size={14} /> },
        ].map((t) => (
          <Link
            key={t.label}
            href={`/repo/${owner}/${name}${t.href}`}
            className={`tab whitespace-nowrap gap-1.5 ${t.active ? "tab-active" : ""}`}
          >
            {t.icon}
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="badge badge-sm badge-ghost">{t.count}</span>
            )}
          </Link>
        ))}
      </div>

      {/* ── Main two-column layout ── */}
      <div className="flex flex-col lg:flex-row gap-4">

        {/* Left: file browser + README */}
        <div className="flex-1 min-w-0">

          {/* Branch selector + actions row */}
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button className="btn btn-sm btn-outline gap-1.5 min-h-[44px] sm:min-h-0">
                <GitBranch size={14} />
                {repo?.default_branch}
                <ChevronRight size={12} className="rotate-90" />
              </button>
              <Link href={`/repo/${owner}/${name}/commits`} className="text-primary text-sm flex items-center gap-1">
                <Clock size={13} /> {commits.length}+ commits
              </Link>
            </div>

            <div className="flex gap-2 relative">
              {/* Code (clone) dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowCode((v) => !v)}
                  className="btn btn-sm btn-success gap-1.5 min-h-[44px] sm:min-h-0"
                >
                  <Code2 size={14} /> Code
                  <ChevronRight size={12} className="rotate-90 opacity-70" />
                </button>

                {showCode && (
                  <div className="absolute right-0 top-[calc(100%+4px)] w-[340px] max-w-[calc(100vw-2rem)] bg-base-200 border border-base-300 rounded-md shadow-2xl z-[100]">
                    <div className="p-3 border-b border-base-300">
                      <div className="flex gap-1 mb-2.5">
                        {(["https", "ssh", "cli"] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => setCloneTab(t)}
                            className={`flex-1 text-xs font-semibold py-1 rounded uppercase ${cloneTab === t ? "bg-base-300 border border-base-300 text-base-content" : "border border-transparent text-base-content/60"}`}
                          >
                            {t}
                          </button>
                        ))}
                        <button onClick={() => setShowCode(false)} className="btn btn-ghost btn-xs">
                          <X size={14} />
                        </button>
                      </div>
                      <div className="flex gap-1.5">
                        <input readOnly value={cloneUrl ?? ""} className="input input-bordered input-xs flex-1 font-mono bg-base-100" />
                        <button onClick={() => copy(cloneUrl ?? "")} className="btn btn-sm btn-outline">
                          {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </div>
                    <div className="px-4 py-2">
                      <a href={`https://github.com/${owner}/${name}/archive/refs/heads/${repo?.default_branch ?? "main"}.zip`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-base-content text-sm py-1.5">
                        <Download size={14} className="text-base-content/60" /> Download ZIP
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* File tree */}
          <div className="border border-base-300 rounded-md overflow-hidden mb-4">
            {/* Latest commit bar */}
            {lastCommit && (
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-base-200 border-b border-base-300 text-sm">
                {lastCommit.author?.avatar_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={lastCommit.author.avatar_url} alt="" className="w-5 h-5 rounded-full border border-base-300" />
                )}
                <span className="font-semibold text-base-content">{lastCommit.author?.login ?? lastCommit.commit.author.name}</span>
                <span className="text-base-content/60 flex-1 truncate">
                  {lastCommit.commit.message.split("\n")[0]}
                </span>
                <span className="text-base-content/60 shrink-0 text-xs">{timeAgo(lastCommit.commit.author.date)}</span>
                <a href={lastCommit.html_url} target="_blank" rel="noopener noreferrer" className="text-base-content/60 text-xs">
                  <code className="font-mono">{lastCommit.sha.slice(0, 7)}</code>
                </a>
              </div>
            )}

            {/* Breadcrumb */}
            {(currentPath || viewingFile) && (
              <div className="flex items-center gap-1 px-4 py-2 border-b border-base-300 text-sm flex-wrap">
                <button onClick={() => { navigateTo(""); setViewingFile(null); }} className="text-primary text-sm bg-transparent border-none p-0">{name}</button>
                {pathParts.map((part, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <span className="text-base-content/40">/</span>
                    {i < pathParts.length - 1 || viewingFile ? (
                      <button onClick={() => navigateTo(pathParts.slice(0, i + 1).join("/"))} className="text-primary text-sm bg-transparent border-none p-0">{part}</button>
                    ) : <span className="text-base-content font-semibold">{part}</span>}
                  </span>
                ))}
                {viewingFile && (
                  <span className="flex items-center gap-1">
                    <span className="text-base-content/40">/</span>
                    <span className="text-base-content font-semibold">{viewingFile.name}</span>
                  </span>
                )}
              </div>
            )}

            {/* Go up */}
            {currentPath && !viewingFile && (
              <div
                onClick={() => { const p = currentPath.split("/"); p.pop(); navigateTo(p.join("/")); }}
                className="flex items-center gap-2.5 px-4 py-1.5 border-b border-base-300 cursor-pointer text-sm hover:bg-base-200"
              >
                <ArrowLeft size={14} className="text-base-content/60" />
                <span className="text-base-content/60">..</span>
              </div>
            )}

            {/* File list */}
            {!viewingFile && files.map((f, i) => (
              <div
                key={f.path}
                onClick={() => openFile(f)}
                className={`flex items-center gap-2.5 px-4 py-1.5 cursor-pointer text-sm hover:bg-base-200 ${i < files.length - 1 ? "border-b border-base-300" : ""}`}
              >
                {f.type === "dir"
                  ? <Folder size={16} className="text-info shrink-0" />
                  : <FileText size={16} className="text-base-content/60 shrink-0" />}
                <span className="flex-1 text-base-content truncate">{f.name}</span>
                <span className="text-base-content/60 text-xs shrink-0 hidden sm:inline truncate max-w-[40%]">
                  {lastCommit?.commit.message.split("\n")[0].slice(0, 60)}
                </span>
                {f.type === "file" && f.size !== undefined && (
                  <span className="text-base-content/40 text-xs shrink-0 ml-3 hidden sm:inline">{formatFileSize(f.size)}</span>
                )}
                <span className="text-base-content/40 text-xs shrink-0">
                  {lastCommit ? timeAgo(lastCommit.commit.author.date) : ""}
                </span>
              </div>
            ))}

            {files.length === 0 && !viewingFile && (
              <div className="py-10 text-center text-base-content/60">Empty directory</div>
            )}

            {/* File viewer */}
            {viewingFile && (
              <div>
                <div className="flex items-center justify-between px-4 py-2 bg-base-200 border-b border-base-300 gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-xs text-base-content/60">
                    <FileText size={13} />
                    <span className="text-base-content font-semibold">{viewingFile.name}</span>
                    {viewingFile.size !== undefined && <span>{formatFileSize(viewingFile.size)}</span>}
                  </div>
                  <div className="flex gap-1">
                    {!editMode && fileContent !== "(Binary file)" && (
                      <button
                        onClick={() => { setEditContent(fileContent); setCommitMsg(`Update ${viewingFile.name}`); setEditMode(true); }}
                        className="btn btn-xs btn-outline gap-1"
                      >
                        <Edit3 size={12} /> Edit
                      </button>
                    )}
                    <button onClick={() => { copy(fileContent); }} className="btn btn-xs btn-outline gap-1">
                      {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />} Copy
                    </button>
                    <button onClick={() => { setViewingFile(null); setEditMode(false); }} className="btn btn-xs btn-outline">
                      <X size={12} />
                    </button>
                  </div>
                </div>

                {fileLoading ? (
                  <div className="flex justify-center p-10">
                    <span className="loading loading-spinner text-primary" />
                  </div>
                ) : editMode ? (
                  <div className="flex flex-col gap-2 p-4 bg-base-100">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="textarea textarea-bordered w-full min-h-[400px] font-mono text-sm leading-relaxed bg-base-100"
                    />
                    <input
                      type="text"
                      placeholder="Commit message"
                      value={commitMsg}
                      onChange={(e) => setCommitMsg(e.target.value)}
                      className="input input-bordered input-sm bg-base-100"
                    />
                    {saveError && <p className="text-error text-xs">{saveError}</p>}
                    <div className="flex gap-2">
                      <button onClick={saveFile} disabled={saving || !commitMsg.trim()} className="btn btn-sm btn-success gap-1">
                        {saving ? <span className="loading loading-spinner loading-xs" /> : <Save size={13} />} Commit changes
                      </button>
                      <button onClick={() => setEditMode(false)} className="btn btn-sm btn-outline">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-base-100 overflow-auto">
                    <pre className="m-0 p-4 font-mono text-sm text-base-content leading-relaxed whitespace-pre-wrap break-all">
                      {fileContent}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* README */}
          {readme && !viewingFile && (
            <div className="border border-base-300 rounded-md overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-base-200 border-b border-base-300 text-sm font-semibold">
                <FileText size={14} className="text-base-content/60" /> README.md
              </div>
              <div className="prose prose-invert max-w-none p-6 sm:p-8 bg-base-100 text-sm leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{readme}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div className="w-full lg:w-72 shrink-0 flex flex-col gap-5">
          {/* About */}
          <div>
            <h3 className="text-base font-semibold mb-3 pb-2 border-b border-base-300">About</h3>
            {repo?.description && <p className="text-sm text-base-content leading-relaxed mb-3">{repo.description}</p>}
            {repo?.homepage && (
              <a href={repo.homepage} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary text-sm mb-2">
                🔗 {repo.homepage}
              </a>
            )}
            {repo?.topics && repo.topics.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mb-3">
                {repo.topics.map((t) => (
                  <span key={t} className="badge badge-sm bg-primary/15 text-primary border-none">{t}</span>
                ))}
              </div>
            )}
            <div className="flex flex-col gap-2">
              {[
                { icon: <Star size={14} />, label: `${repo?.stargazers_count?.toLocaleString()} stars` },
                { icon: <Eye size={14} />, label: `${repo?.watchers_count?.toLocaleString()} watching` },
                { icon: <GitFork size={14} />, label: `${repo?.forks_count?.toLocaleString()} forks` },
                ...(repo?.license ? [{ icon: <span className="text-sm">⚖️</span>, label: repo.license.spdx_id }] : []),
                ...(repo?.size ? [{ icon: <span className="text-sm">💾</span>, label: formatSize(repo.size) }] : []),
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-base-content/60">
                  <span className="text-base-content">{item.icon}</span> {item.label}
                </div>
              ))}
            </div>
          </div>

          {/* Languages */}
          {repo?.language && (
            <div>
              <h3 className="text-base font-semibold mb-3 pb-2 border-b border-base-300">Languages</h3>
              <div className="flex gap-2 items-center text-sm text-base-content/60">
                <span className="w-3 h-3 rounded-full inline-block shrink-0" style={{ background: langColor[repo.language] ?? "#888" }} />
                {repo.language}
              </div>
            </div>
          )}

          {/* Recent commits */}
          <div>
            <h3 className="text-base font-semibold mb-3 pb-2 border-b border-base-300 flex justify-between">
              Commits
              <Link href={`/repo/${owner}/${name}/commits`} className="text-xs text-primary font-normal">View all →</Link>
            </h3>
            <div className="flex flex-col gap-3">
              {commits.slice(0, 5).map((c) => (
                <div key={c.sha} className="flex gap-2 items-start">
                  {c.author?.avatar_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.author.avatar_url} alt="" className="w-5 h-5 rounded-full shrink-0 border border-base-300 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-base-content leading-snug truncate mb-0.5">
                      {c.commit.message.split("\n")[0]}
                    </p>
                    <div className="flex gap-1.5 items-center text-[11px] text-base-content/40">
                      <a href={c.html_url} target="_blank" rel="noopener noreferrer" className="text-primary font-mono">{c.sha.slice(0, 7)}</a>
                      <span>·</span>
                      <span>{timeAgo(c.commit.author.date)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-col gap-2">
            <Link href={`/repo/${owner}/${name}/ai`} className="btn btn-sm btn-outline gap-1.5 min-h-[44px] sm:min-h-0">
              <Sparkles size={14} className="text-primary" /> Ask AI about this repo
            </Link>
            <a href={repo?.html_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost gap-1.5 min-h-[44px] sm:min-h-0 text-base-content/60">
              <Eye size={13} /> View on GitHub ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
