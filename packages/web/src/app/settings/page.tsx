"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { Settings, User, Key, Bot, Palette, LogOut, CheckCircle, AlertCircle, Github } from "lucide-react";

const NIM_MODELS = [
  { id: "deepseek-ai/deepseek-v4-flash", label: "DeepSeek V4 Flash", desc: "Fastest — best for quick answers" },
  { id: "meta/llama-3.3-70b-instruct", label: "Llama 3.3 70B", desc: "Balanced speed and quality" },
  { id: "nvidia/llama-3.1-nemotron-70b-instruct", label: "Nemotron 70B", desc: "Best quality, slower" },
];

const THEMES = [
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
  { id: "synthwave", label: "Synthwave" },
  { id: "dracula", label: "Dracula" },
  { id: "nord", label: "Nord" },
  { id: "forest", label: "Forest" },
];

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [savedModel, setSavedModel] = useState("deepseek-ai/deepseek-v4-flash");
  const [savedTheme, setSavedTheme] = useState("dark");
  const [githubConnected, setGithubConnected] = useState<boolean | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const m = localStorage.getItem("yagt_ai_model");
    if (m) setSavedModel(m);
    const t = localStorage.getItem("yagt_theme") ?? "dark";
    setSavedTheme(t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  useEffect(() => {
    if (!isLoaded || !user) return;
    const oauthAccounts = user.externalAccounts ?? [];
    const gh = oauthAccounts.find((a) => String(a.provider) === "oauth_github");
    setGithubConnected(!!gh);
  }, [isLoaded, user]);

  function saveModel(model: string) {
    setSavedModel(model);
    localStorage.setItem("yagt_ai_model", model);
    flash();
  }

  function saveTheme(theme: string) {
    setSavedTheme(theme);
    localStorage.setItem("yagt_theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    flash();
  }

  function flash() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <AlertCircle size={32} className="text-warning" />
        <p className="text-base-content/60">Sign in to access settings.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Title */}
      <div className="flex items-center gap-2">
        <Settings size={18} className="text-primary" />
        <h1 className="text-xl font-bold">Settings</h1>
        {saved && (
          <span className="flex items-center gap-1 text-success text-sm ml-auto">
            <CheckCircle size={14} /> Saved
          </span>
        )}
      </div>

      {/* Profile */}
      <section className="card card-bordered bg-base-200">
        <div className="card-body gap-4">
          <h2 className="font-semibold text-base flex items-center gap-2">
            <User size={15} /> Profile
          </h2>
          <div className="flex items-center gap-4">
            {user.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.imageUrl} alt="" className="w-14 h-14 rounded-full" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-xl text-white font-bold">
                {(user.username ?? user.firstName ?? "?")[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold">
                {user.fullName ?? user.username ?? "—"}
              </p>
              <p className="text-sm text-base-content/50">
                @{user.username ?? "unknown"}
              </p>
              <p className="text-xs text-base-content/40 mt-0.5">
                {user.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </div>
          <p className="text-xs text-base-content/40">
            Profile is managed via Clerk. Click your avatar in the top right to update it.
          </p>
        </div>
      </section>

      {/* GitHub Connection */}
      <section className="card card-bordered bg-base-200">
        <div className="card-body gap-3">
          <h2 className="font-semibold text-base flex items-center gap-2">
            <Github size={15} /> GitHub Connection
          </h2>
          {githubConnected === null ? (
            <span className="loading loading-sm loading-spinner" />
          ) : githubConnected ? (
            <div className="flex items-center gap-2 text-success text-sm">
              <CheckCircle size={15} />
              <span>GitHub account connected</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-warning text-sm">
                <AlertCircle size={15} />
                <span>GitHub not connected — private repos and higher rate limits unavailable</span>
              </div>
            </div>
          )}
          <div className="text-xs text-base-content/40 space-y-1">
            <p>To connect GitHub: go to <strong>Clerk Dashboard → Social Connections → GitHub</strong></p>
            <p>Enable with <code className="bg-base-300 px-1 rounded">repo</code> scope so yagt can access your private repositories.</p>
          </div>
        </div>
      </section>

      {/* AI Model */}
      <section className="card card-bordered bg-base-200">
        <div className="card-body gap-3">
          <h2 className="font-semibold text-base flex items-center gap-2">
            <Bot size={15} /> AI Model
          </h2>
          <p className="text-sm text-base-content/50">
            Select the NVIDIA NIM model used for AI responses.
          </p>
          <div className="flex flex-col gap-2">
            {NIM_MODELS.map((m) => (
              <label
                key={m.id}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  savedModel === m.id
                    ? "border-primary bg-primary/5"
                    : "border-base-300 hover:border-base-content/20"
                }`}
              >
                <input
                  type="radio"
                  name="model"
                  className="radio radio-primary radio-sm mt-0.5"
                  checked={savedModel === m.id}
                  onChange={() => saveModel(m.id)}
                />
                <div>
                  <p className="text-sm font-medium">{m.label}</p>
                  <p className="text-xs text-base-content/50">{m.desc}</p>
                  <p className="text-xs text-base-content/30 font-mono mt-0.5">{m.id}</p>
                </div>
              </label>
            ))}
          </div>
          <p className="text-xs text-base-content/40">
            Model preference is stored locally in your browser.
          </p>
        </div>
      </section>

      {/* Theme */}
      <section className="card card-bordered bg-base-200">
        <div className="card-body gap-3">
          <h2 className="font-semibold text-base flex items-center gap-2">
            <Palette size={15} /> Theme
          </h2>
          <div className="flex gap-2 flex-wrap">
            {THEMES.map((t) => (
              <button
                key={t.id}
                data-theme={t.id}
                onClick={() => saveTheme(t.id)}
                className={`btn btn-sm ${
                  savedTheme === t.id ? "btn-primary" : "btn-ghost border border-base-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* API Keys info */}
      <section className="card card-bordered bg-base-200">
        <div className="card-body gap-3">
          <h2 className="font-semibold text-base flex items-center gap-2">
            <Key size={15} /> API Keys
          </h2>
          <div className="text-sm text-base-content/60 space-y-2">
            <p>API keys are configured server-side in <code className="bg-base-300 px-1 rounded text-xs">.env.local</code>:</p>
            <ul className="list-disc list-inside space-y-1 text-xs text-base-content/50">
              <li><code className="bg-base-300 px-1 rounded">NVIDIA_API_KEY</code> — for AI features (NVIDIA NIMs)</li>
              <li><code className="bg-base-300 px-1 rounded">GITHUB_TOKEN</code> — fallback GitHub token for unauthenticated requests</li>
              <li><code className="bg-base-300 px-1 rounded">CLERK_SECRET_KEY</code> — Clerk authentication</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Sign out */}
      <section className="card card-bordered border-error/30 bg-base-200">
        <div className="card-body gap-3">
          <h2 className="font-semibold text-base text-error">Danger Zone</h2>
          <button
            onClick={() => signOut({ redirectUrl: "/" })}
            className="btn btn-sm btn-error btn-outline w-fit gap-2"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </section>
    </div>
  );
}
