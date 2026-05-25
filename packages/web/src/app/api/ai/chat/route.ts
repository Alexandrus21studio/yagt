import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";

const NIM_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const NIM_MODEL = "meta/llama-3.3-70b-instruct";
const GITHUB_BASE = "https://api.github.com";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

async function getGitHubToken(userId: string | null): Promise<string | undefined> {
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

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  const nimKey = process.env.NVIDIA_API_KEY;

  if (!nimKey) {
    return NextResponse.json({ error: "NVIDIA_API_KEY not configured" }, { status: 500 });
  }

  const body = await req.json();
  const { messages, owner, repo }: { messages: Message[]; owner: string; repo: string } = body;

  const ghToken = await getGitHubToken(userId);

  // Build repo context
  let context = `Repository: ${owner}/${repo}\n`;
  try {
    const [repoData, commits, readme] = await Promise.all([
      ghFetch(`/repos/${owner}/${repo}`, ghToken),
      ghFetch(`/repos/${owner}/${repo}/commits?per_page=10`, ghToken),
      ghFetch(`/repos/${owner}/${repo}/readme`, ghToken),
    ]);

    if (repoData) {
      context += `Description: ${repoData.description ?? "none"}\n`;
      context += `Language: ${repoData.language ?? "unknown"}\n`;
      context += `Stars: ${repoData.stargazers_count}, Forks: ${repoData.forks_count}, Open issues: ${repoData.open_issues_count}\n`;
    }

    if (commits && Array.isArray(commits)) {
      context += `\nRecent commits:\n`;
      commits.slice(0, 8).forEach((c: { sha: string; commit: { message: string; author: { name: string } } }) => {
        context += `  ${c.sha.slice(0, 7)} ${c.commit.message.split("\n")[0]} — ${c.commit.author.name}\n`;
      });
    }

    if (readme?.content) {
      const readmeText = Buffer.from(readme.content, "base64").toString("utf-8");
      context += `\nREADME (excerpt):\n${readmeText.slice(0, 2000)}\n`;
    }
  } catch {
    // proceed without context
  }

  const systemMessage: Message = {
    role: "system",
    content: `You are an expert developer assistant helping users understand and work with GitHub repositories. Be concise, accurate, and practical.\n\n${context}`,
  };

  const nimMessages = [systemMessage, ...messages.map((m) => ({ role: m.role, content: m.content }))];

  try {
    const res = await fetch(NIM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${nimKey}`,
      },
      body: JSON.stringify({
        model: NIM_MODEL,
        messages: nimMessages,
        max_tokens: 1024,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `NIM API error: ${err}` }, { status: res.status });
    }

    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content ?? "No response from AI.";
    return NextResponse.json({ answer });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "AI request failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
