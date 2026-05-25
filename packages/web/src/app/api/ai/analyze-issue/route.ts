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

  const { owner, repo, issueNumber, title, body } = await req.json();
  const ghToken = await getGitHubToken(userId);

  let context = `Repository: ${owner ?? "unknown"}/${repo ?? "unknown"}\n`;
  let issueText = `Issue: ${title ?? "Untitled"}\n${body ?? ""}`;

  if (owner && repo && issueNumber) {
    try {
      const [issueData, comments, readme, repoData] = await Promise.all([
        ghFetch(`/repos/${owner}/${repo}/issues/${issueNumber}`, ghToken),
        ghFetch(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`, ghToken),
        ghFetch(`/repos/${owner}/${repo}/readme`, ghToken),
        ghFetch(`/repos/${owner}/${repo}`, ghToken),
      ]);

      if (repoData) {
        context += `Language: ${repoData.language ?? "unknown"}\nDescription: ${repoData.description ?? "none"}\n`;
      }
      if (readme?.content) {
        const readmeText = Buffer.from(readme.content, "base64").toString("utf-8");
        context += `\nREADME:\n${readmeText.slice(0, 2000)}\n`;
      }
      if (issueData) {
        issueText = `Issue #${issueNumber}: ${issueData.title}\n\n${issueData.body ?? ""}\n`;
        if (Array.isArray(comments) && comments.length > 0) {
          issueText += `\nComments:\n${comments.slice(0, 5).map((c: { user: { login: string }; body: string }) => `@${c.user.login}: ${c.body}`).join("\n\n")}`;
        }
      }
    } catch { /* proceed without full context */ }
  }

  const prompt = `You are an expert developer analyzing a GitHub issue.\n\n${context}\n${issueText}\n\nProvide:\n1. A concise summary (1-2 sentences)\n2. Severity: low / medium / high — with reason\n3. Suggested labels (comma-separated)\n4. Actionable fix suggestion or next step\n\nFormat as JSON: { "summary": "...", "severity": "low|medium|high", "severityReason": "...", "labels": [...], "suggestion": "..." }`;

  try {
    const res = await fetch(NIM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${nimKey}` },
      body: JSON.stringify({
        model: "deepseek-ai/deepseek-v4-flash",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 512,
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "AI request failed" }, { status: res.status });
    }

    const data = await res.json();
    const rawAnswer = data.choices?.[0]?.message?.content ?? "{}";
    // Extract JSON from response
    const match = rawAnswer.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        return NextResponse.json({ ...parsed, generatedAt: new Date().toISOString() });
      } catch { /* fall through */ }
    }
    return NextResponse.json({
      summary: rawAnswer,
      severity: "medium",
      labels: ["triage"],
      suggestion: "Review the issue and assign to the relevant maintainer.",
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "AI request failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
