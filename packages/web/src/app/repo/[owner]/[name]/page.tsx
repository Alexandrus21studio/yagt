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

const S = {
  border: "1px solid #30363d",
  borderMuted: "1px solid #21262d",
  bg: "#0d1117",
  surface: "#161b22",
  surface2: "#21262d",
  text: "#e6edf3",
  muted: "#8b949e",
  subtle: "#6e7681",
  accent: "#58a6ff",
  green: "#238636",
  greenFg: "#3fb950",
};

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

  if (loading) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200 }}><span className="loading loading-spinner loading-lg" style={{ color: S.accent }} /></div>;
  if (error) return <div style={{ background: "#2d1b1b", border: "1px solid #f85149", borderRadius: 6, padding: "12px 16px", color: "#f85149" }}>{error}</div>;

  const pathParts = currentPath ? currentPath.split("/") : [];
  const lastCommit = commits[0];
  const cloneUrl = cloneTab === "https" ? repo?.clone_url : cloneTab === "ssh" ? repo?.ssh_url : `gh repo clone ${owner}/${name}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* ── Repo header ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {/* Breadcrumb + badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Code2 size={16} style={{ color: S.muted }} />
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 20, fontWeight: 300 }}>
            <Link href="/" style={{ color: S.accent, textDecoration: "none", fontWeight: 400 }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}>{owner}</Link>
            <span style={{ color: S.muted }}>/</span>
            <Link href={`/repo/${owner}/${name}`} style={{ color: S.accent, textDecoration: "none", fontWeight: 700 }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}>{name}</Link>
          </div>
          <span style={{ border: S.border, borderRadius: "2em", color: S.muted, fontSize: 12, padding: "2px 8px" }}>
            {repo?.private ? "Private" : "Public"}
          </span>
        </div>

        {/* Watch / Star / Fork buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button style={{ display: "flex", alignItems: "center", gap: 0, background: S.surface2, border: S.border, borderRadius: 6, color: S.text, fontSize: 12, fontWeight: 600, cursor: "pointer", overflow: "hidden" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRight: S.border }}>
              <Eye size={14} /> Watch
            </span>
            <span style={{ padding: "5px 10px" }}>{repo?.watchers_count?.toLocaleString()}</span>
          </button>

          <button
            onClick={() => setStarred((v) => !v)}
            style={{ display: "flex", alignItems: "center", gap: 0, background: S.surface2, border: S.border, borderRadius: 6, color: S.text, fontSize: 12, fontWeight: 600, cursor: "pointer", overflow: "hidden" }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRight: S.border, color: starred ? "#e3b341" : S.text }}>
              <Star size={14} fill={starred ? "#e3b341" : "none"} /> {starred ? "Starred" : "Star"}
            </span>
            <span style={{ padding: "5px 10px" }}>{((repo?.stargazers_count ?? 0) + (starred ? 1 : 0)).toLocaleString()}</span>
          </button>

          <button
            onClick={forkRepo}
            disabled={forking}
            style={{ display: "flex", alignItems: "center", gap: 0, background: forkDone ? "#1a2f23" : S.surface2, border: forkDone ? "1px solid #238636" : S.border, borderRadius: 6, color: forkDone ? S.greenFg : S.text, fontSize: 12, fontWeight: 600, cursor: "pointer", overflow: "hidden" }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRight: forkDone ? "1px solid #238636" : S.border }}>
              <GitFork size={14} /> {forkDone ? "Forked!" : "Fork"}
            </span>
            <span style={{ padding: "5px 10px" }}>{repo?.forks_count?.toLocaleString()}</span>
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ borderBottom: S.border, display: "flex", gap: 0, marginBottom: 16, overflowX: "auto" }}>
        {[
          { label: "Code", href: "", icon: <Code2 size={14} /> },
          { label: "Issues", href: "/issues", icon: <AlertCircle size={14} />, count: repo?.open_issues_count },
          { label: "Pull requests", href: "/pulls", icon: <GitBranch size={14} /> },
          { label: "Commits", href: "/commits", icon: <GitCommit size={14} /> },
          { label: "AI Assistant", href: "/ai", icon: <Sparkles size={14} /> },
        ].map((t) => (
          <Link key={t.label} href={`/repo/${owner}/${name}${t.href}`}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", color: t.label === "Code" ? S.text : S.muted, textDecoration: "none", fontSize: 13, fontWeight: t.label === "Code" ? 600 : 400, borderBottom: t.label === "Code" ? "2px solid #f78166" : "2px solid transparent", whiteSpace: "nowrap" }}
            onMouseEnter={(e) => { if (t.label !== "Code") e.currentTarget.style.color = S.text; }}
            onMouseLeave={(e) => { if (t.label !== "Code") e.currentTarget.style.color = S.muted; }}
          >
            <span style={{ color: t.label === "Code" ? S.text : S.muted }}>{t.icon}</span>
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span style={{ background: S.surface2, border: S.border, borderRadius: "2em", fontSize: 11, padding: "0 6px", lineHeight: "18px", color: S.muted }}>{t.count}</span>
            )}
          </Link>
        ))}
      </div>

      {/* ── Main two-column layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 296px", gap: 24 }} className="gh-repo-grid">

        {/* Left: file browser + README */}
        <div style={{ minWidth: 0 }}>

          {/* Branch selector + actions row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button style={{ display: "flex", alignItems: "center", gap: 6, background: S.surface2, border: S.border, borderRadius: 6, color: S.text, fontSize: 13, fontWeight: 600, padding: "5px 12px", cursor: "pointer" }}>
                <GitBranch size={14} />
                {repo?.default_branch}
                <ChevronRight size={12} style={{ transform: "rotate(90deg)" }} />
              </button>
              <span style={{ color: S.muted, fontSize: 13 }}>
                <Link href={`/repo/${owner}/${name}/commits`} style={{ color: S.accent, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                  <Clock size={13} /> {commits.length}+ commits
                </Link>
              </span>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              {/* Code (clone) dropdown */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowCode((v) => !v)}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: S.green, border: "1px solid rgba(240,246,252,0.1)", borderRadius: 6, color: "#fff", fontSize: 13, fontWeight: 600, padding: "5px 16px", cursor: "pointer" }}
                >
                  <Code2 size={14} /> Code
                  <ChevronRight size={12} style={{ transform: "rotate(90deg)", color: "rgba(255,255,255,0.7)" }} />
                </button>

                {showCode && (
                  <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", width: 340, background: S.surface, border: S.border, borderRadius: 6, boxShadow: "0 8px 24px rgba(1,4,9,0.8)", zIndex: 100 }}>
                    <div style={{ padding: "12px 16px", borderBottom: S.borderMuted }}>
                      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                        {(["https", "ssh", "cli"] as const).map((t) => (
                          <button key={t} onClick={() => setCloneTab(t)}
                            style={{ flex: 1, background: cloneTab === t ? S.surface2 : "none", border: cloneTab === t ? S.border : "1px solid transparent", borderRadius: 4, color: cloneTab === t ? S.text : S.muted, fontSize: 12, fontWeight: 600, padding: "4px 0", cursor: "pointer", textTransform: "uppercase" }}>
                            {t}
                          </button>
                        ))}
                        <button onClick={() => setShowCode(false)} style={{ background: "none", border: "none", color: S.muted, cursor: "pointer", padding: "4px 8px" }}>
                          <X size={14} />
                        </button>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input readOnly value={cloneUrl ?? ""} style={{ flex: 1, background: S.bg, border: S.border, borderRadius: 4, color: S.text, fontSize: 12, fontFamily: "monospace", padding: "6px 10px", outline: "none" }} />
                        <button onClick={() => copy(cloneUrl ?? "")} style={{ background: S.surface2, border: S.border, borderRadius: 4, color: S.text, cursor: "pointer", padding: "6px 10px" }}>
                          {copied ? <Check size={13} style={{ color: S.greenFg }} /> : <Copy size={13} />}
                        </button>
                      </div>
                    </div>
                    <div style={{ padding: "8px 16px" }}>
                      <a href={`https://github.com/${owner}/${name}/archive/refs/heads/${repo?.default_branch ?? "main"}.zip`} target="_blank" rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: 8, color: S.text, textDecoration: "none", fontSize: 13, padding: "6px 0" }}>
                        <Download size={14} style={{ color: S.muted }} /> Download ZIP
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* File tree */}
          <div style={{ border: S.border, borderRadius: 6, overflow: "hidden", marginBottom: 16 }}>
            {/* Latest commit bar */}
            {lastCommit && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: S.surface, borderBottom: S.border, fontSize: 13 }}>
                {lastCommit.author?.avatar_url && (
                  <img src={lastCommit.author.avatar_url} alt="" style={{ width: 20, height: 20, borderRadius: "50%", border: S.border }} />
                )}
                <span style={{ fontWeight: 600, color: S.text }}>{lastCommit.author?.login ?? lastCommit.commit.author.name}</span>
                <span style={{ color: S.muted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {lastCommit.commit.message.split("\n")[0]}
                </span>
                <span style={{ color: S.muted, flexShrink: 0, fontSize: 12 }}>{timeAgo(lastCommit.commit.author.date)}</span>
                <a href={lastCommit.html_url} target="_blank" rel="noopener noreferrer" style={{ color: S.muted, fontSize: 12 }}>
                  <code style={{ fontFamily: "monospace" }}>{lastCommit.sha.slice(0, 7)}</code>
                </a>
              </div>
            )}

            {/* Breadcrumb */}
            {(currentPath || viewingFile) && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 16px", borderBottom: S.borderMuted, fontSize: 13, flexWrap: "wrap" }}>
                <button onClick={() => { navigateTo(""); setViewingFile(null); }} style={{ background: "none", border: "none", color: S.accent, cursor: "pointer", padding: 0, fontSize: 13 }}>{name}</button>
                {pathParts.map((part, i) => (
                  <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ color: S.subtle }}>/</span>
                    {i < pathParts.length - 1 || viewingFile ? (
                      <button onClick={() => navigateTo(pathParts.slice(0, i + 1).join("/"))} style={{ background: "none", border: "none", color: S.accent, cursor: "pointer", padding: 0, fontSize: 13 }}>{part}</button>
                    ) : <span style={{ color: S.text, fontWeight: 600 }}>{part}</span>}
                  </span>
                ))}
                {viewingFile && (
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ color: S.subtle }}>/</span>
                    <span style={{ color: S.text, fontWeight: 600 }}>{viewingFile.name}</span>
                  </span>
                )}
              </div>
            )}

            {/* Go up */}
            {currentPath && !viewingFile && (
              <div onClick={() => { const p = currentPath.split("/"); p.pop(); navigateTo(p.join("/")); }}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 16px", borderBottom: S.borderMuted, cursor: "pointer", fontSize: 13 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = S.surface)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <ArrowLeft size={14} style={{ color: S.muted }} />
                <span style={{ color: S.muted }}>..</span>
              </div>
            )}

            {/* File list */}
            {!viewingFile && files.map((f, i) => (
              <div key={f.path}
                onClick={() => openFile(f)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 16px", borderBottom: i < files.length - 1 ? S.borderMuted : "none", cursor: "pointer", fontSize: 13, transition: "background 0.1s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = S.surface)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {f.type === "dir"
                  ? <Folder size={16} style={{ color: "#8ab4f8", flexShrink: 0 }} />
                  : <FileText size={16} style={{ color: S.muted, flexShrink: 0 }} />}
                <span style={{ flex: 1, color: f.type === "dir" ? S.text : S.text, fontWeight: f.type === "dir" ? 400 : 400 }}>{f.name}</span>
                <span style={{ color: S.muted, fontSize: 12, flexShrink: 0 }}>
                  {lastCommit?.commit.message.split("\n")[0].slice(0, 60)}
                </span>
                {f.type === "file" && f.size !== undefined && (
                  <span style={{ color: S.subtle, fontSize: 12, flexShrink: 0, marginLeft: 12 }}>{formatFileSize(f.size)}</span>
                )}
                <span style={{ color: S.subtle, fontSize: 12, flexShrink: 0 }}>
                  {lastCommit ? timeAgo(lastCommit.commit.author.date) : ""}
                </span>
              </div>
            ))}

            {files.length === 0 && !viewingFile && (
              <div style={{ padding: "40px 16px", textAlign: "center", color: S.muted }}>Empty directory</div>
            )}

            {/* File viewer */}
            {viewingFile && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", background: S.surface, borderBottom: S.border, gap: 8, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: S.muted }}>
                    <FileText size={13} />
                    <span style={{ color: S.text, fontWeight: 600 }}>{viewingFile.name}</span>
                    {viewingFile.size !== undefined && <span>{formatFileSize(viewingFile.size)}</span>}
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {!editMode && fileContent !== "(Binary file)" && (
                      <button onClick={() => { setEditContent(fileContent); setCommitMsg(`Update ${viewingFile.name}`); setEditMode(true); }}
                        style={{ display: "flex", alignItems: "center", gap: 4, background: S.surface2, border: S.border, borderRadius: 6, color: S.text, fontSize: 12, padding: "4px 10px", cursor: "pointer" }}>
                        <Edit3 size={12} /> Edit
                      </button>
                    )}
                    <button onClick={() => { copy(fileContent); }}
                      style={{ display: "flex", alignItems: "center", gap: 4, background: S.surface2, border: S.border, borderRadius: 6, color: S.text, fontSize: 12, padding: "4px 10px", cursor: "pointer" }}>
                      {copied ? <Check size={12} style={{ color: S.greenFg }} /> : <Copy size={12} />} Copy
                    </button>
                    <button onClick={() => { setViewingFile(null); setEditMode(false); }}
                      style={{ background: S.surface2, border: S.border, borderRadius: 6, color: S.muted, fontSize: 12, padding: "4px 8px", cursor: "pointer" }}>
                      <X size={12} />
                    </button>
                  </div>
                </div>

                {fileLoading ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
                    <span className="loading loading-spinner" style={{ color: S.accent }} />
                  </div>
                ) : editMode ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 16, background: S.bg }}>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      style={{ width: "100%", minHeight: 400, background: S.bg, border: S.border, borderRadius: 6, color: S.text, fontFamily: "ui-monospace, monospace", fontSize: 13, padding: 16, resize: "vertical", outline: "none", lineHeight: 1.6 }}
                    />
                    <input type="text" placeholder="Commit message" value={commitMsg} onChange={(e) => setCommitMsg(e.target.value)}
                      style={{ background: S.bg, border: S.border, borderRadius: 6, color: S.text, fontSize: 13, padding: "8px 12px", outline: "none" }}
                    />
                    {saveError && <p style={{ color: "#f85149", fontSize: 12 }}>{saveError}</p>}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={saveFile} disabled={saving || !commitMsg.trim()}
                        style={{ display: "flex", alignItems: "center", gap: 4, background: S.green, border: "1px solid rgba(240,246,252,0.1)", borderRadius: 6, color: "#fff", fontSize: 13, fontWeight: 600, padding: "6px 16px", cursor: "pointer" }}>
                        {saving ? <span className="loading loading-spinner loading-xs" /> : <Save size={13} />} Commit changes
                      </button>
                      <button onClick={() => setEditMode(false)}
                        style={{ background: S.surface2, border: S.border, borderRadius: 6, color: S.text, fontSize: 13, padding: "6px 16px", cursor: "pointer" }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: S.bg, overflow: "auto" }}>
                    <pre style={{ margin: 0, padding: 16, fontFamily: "ui-monospace, monospace", fontSize: 13, color: S.text, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                      {fileContent}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* README */}
          {readme && !viewingFile && (
            <div style={{ border: S.border, borderRadius: 6, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: S.surface, borderBottom: S.border, fontSize: 13, fontWeight: 600 }}>
                <FileText size={14} style={{ color: S.muted }} /> README.md
              </div>
              <div className="prose prose-invert max-w-none" style={{ padding: "24px 32px", background: S.bg, fontSize: 14, lineHeight: 1.7 }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{readme}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* About */}
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, paddingBottom: 8, borderBottom: S.border }}>About</h3>
            {repo?.description && <p style={{ fontSize: 14, color: S.text, lineHeight: 1.5, marginBottom: 12 }}>{repo.description}</p>}
            {repo?.homepage && (
              <a href={repo.homepage} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 6, color: S.accent, fontSize: 13, marginBottom: 8, textDecoration: "none" }}>
                🔗 {repo.homepage}
              </a>
            )}
            {repo?.topics && repo.topics.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                {repo.topics.map((t) => (
                  <span key={t} style={{ background: "rgba(56,139,253,0.15)", color: "#58a6ff", borderRadius: "2em", fontSize: 12, fontWeight: 500, padding: "2px 10px" }}>{t}</span>
                ))}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { icon: <Star size={14} />, label: `${repo?.stargazers_count?.toLocaleString()} stars` },
                { icon: <Eye size={14} />, label: `${repo?.watchers_count?.toLocaleString()} watching` },
                { icon: <GitFork size={14} />, label: `${repo?.forks_count?.toLocaleString()} forks` },
                ...(repo?.license ? [{ icon: <span style={{ fontSize: 14 }}>⚖️</span>, label: repo.license.spdx_id }] : []),
                ...(repo?.size ? [{ icon: <span style={{ fontSize: 14 }}>💾</span>, label: formatSize(repo.size) }] : []),
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: S.muted }}>
                  <span style={{ color: S.text }}>{item.icon}</span> {item.label}
                </div>
              ))}
            </div>
          </div>

          {/* Languages */}
          {repo?.language && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, paddingBottom: 8, borderBottom: S.border }}>Languages</h3>
              <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: S.muted }}>
                <span style={{ width: 12, height: 12, borderRadius: "50%", background: langColor[repo.language] ?? "#888", display: "inline-block", flexShrink: 0 }} />
                {repo.language}
              </div>
            </div>
          )}

          {/* Recent commits */}
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, paddingBottom: 8, borderBottom: S.border, display: "flex", justifyContent: "space-between" }}>
              Commits
              <Link href={`/repo/${owner}/${name}/commits`} style={{ fontSize: 12, color: S.accent, textDecoration: "none", fontWeight: 400 }}>View all →</Link>
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {commits.slice(0, 5).map((c) => (
                <div key={c.sha} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  {c.author?.avatar_url && <img src={c.author.avatar_url} alt="" style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, border: S.border, marginTop: 1 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, color: S.text, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>
                      {c.commit.message.split("\n")[0]}
                    </p>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, color: S.subtle }}>
                      <a href={c.html_url} target="_blank" rel="noopener noreferrer" style={{ color: S.accent, fontFamily: "monospace", textDecoration: "none" }}>{c.sha.slice(0, 7)}</a>
                      <span>·</span>
                      <span>{timeAgo(c.commit.author.date)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Link href={`/repo/${owner}/${name}/ai`}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: S.surface2, border: S.border, borderRadius: 6, color: S.text, fontSize: 13, fontWeight: 600, padding: "8px 16px", textDecoration: "none" }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = S.accent}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = "#30363d"}
            >
              <Sparkles size={14} style={{ color: S.accent }} /> Ask AI about this repo
            </Link>
            <a href={repo?.html_url} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "none", border: S.border, borderRadius: 6, color: S.muted, fontSize: 13, padding: "6px 16px", textDecoration: "none" }}>
              <Eye size={13} /> View on GitHub ↗
            </a>
          </div>
        </div>
      </div>

      <style>{`@media(max-width:899px){.gh-repo-grid{grid-template-columns:1fr!important;}}`}</style>
    </div>
  );
}
