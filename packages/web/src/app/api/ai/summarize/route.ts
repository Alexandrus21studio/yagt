import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";

const NIM_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const GITHUB_BASE = "https://api.github.com";

async function getGitHubToken(userId: string | null) {
  if (!userId) return process.env.GITHUB_TOKEN;
  try {
    const client = await clerkClient();
    const tokens = await client.users.getUserOauthAccessToken(userId, "oauth_github");
    return tokens.data[0]?.token ?? process.env.GITHUB_TOKEN;
  } catch {
    return process.env.GITHUB_TOKEN;
  }
}

async function ghFetch(endpoint: string, token?: string) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "yagt-web",
  };
  if (token) headers.Authorization = `token ${token}`;
  const res = await fetch(`${GITHUB_BASE}${endpoint}`, { headers, cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export async function POST(req: Request) {
  const { userId } = await auth();
  const nimKey = process.env.NVIDIA_API_KEY;
  if (!nimKey) return NextResponse.json({ error: "NVIDIA_API_KEY not configured" }, { status: 500 });

  const { owner, repo } = await req.json();
  if (!owner || !repo) return NextResponse.json({ error: "owner and repo required" }, { status: 400 });

  const ghToken = await getGitHubToken(userId);

  let context = `Repository: ${owner}/${repo}\n`;
  try {
    const [repoData, commits, readme, languages] = await Promise.all([
      ghFetch(`/repos/${owner}/${repo}`, ghToken),
      ghFetch(`/repos/${owner}/${repo}/commits?per_page=15`, ghToken),
      ghFetch(`/repos/${owner}/${repo}/readme`, ghToken),
      ghFetch(`/repos/${owner}/${repo}/languages`, ghToken),
    ]);

    if (repoData) {
      context += `Description: ${repoData.description ?? "none"}\n`;
      context += `Stars: ${repoData.stargazers_count}, Forks: ${repoData.forks_count}, Open issues: ${repoData.open_issues_count}\n`;
      context += `Created: ${repoData.created_at?.split("T")[0]}, Updated: ${repoData.updated_at?.split("T")[0]}\n`;
    }
    if (languages) {
      context += `Languages: ${Object.keys(languages).join(", ")}\n`;
    }
    if (commits && Array.isArray(commits)) {
      context += `\nRecent commits:\n${commits.map((c: { sha: string; commit: { message: string; author: { name: string } } }) =>
        `  ${c.sha.slice(0, 7)} ${c.commit.message.split("\n")[0]} — ${c.commit.author.name}`
      ).join("\n")}\n`;
    }
    if (readme?.content) {
      const readmeText = Buffer.from(readme.content, "base64").toString("utf-8");
      context += `\nREADME:\n${readmeText.slice(0, 3000)}\n`;
    }
  } catch { /* proceed with whatever we have */ }

  const prompt = `${context}\n\nWrite a concise, informative summary of this GitHub repository in 3-4 sentences. Cover: what it does, who it's for, main technologies used, and current development activity. Be factual and specific, not generic.`;

  try {
    const res = await fetch(NIM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${nimKey}` },
      body: JSON.stringify({
        model: "meta/llama-3.3-70b-instruct",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 256,
        temperature: 0.3,
      }),
    });

    if (!res.ok) return NextResponse.json({ error: "AI request failed" }, { status: res.status });

    const data = await res.json();
    const summary = data.choices?.[0]?.message?.content ?? "Unable to generate summary.";
    return NextResponse.json({ summary, generatedAt: new Date().toISOString() });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "AI request failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
