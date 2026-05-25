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

  const { owner, repo, pullNumber } = await req.json();
  if (!owner || !repo || !pullNumber) {
    return NextResponse.json({ error: "owner, repo, and pullNumber required" }, { status: 400 });
  }

  const ghToken = await getGitHubToken(userId);

  const files = await ghFetch(`/repos/${owner}/${repo}/pulls/${pullNumber}/files`, ghToken);
  const pr = await ghFetch(`/repos/${owner}/${repo}/pulls/${pullNumber}`, ghToken);

  let diffSummary = `Pull Request: ${pr?.title ?? `#${pullNumber}`}\n`;
  diffSummary += `Branch: ${pr?.head?.ref ?? "?"} → ${pr?.base?.ref ?? "?"}\n`;
  diffSummary += `Changes: +${pr?.additions ?? 0} -${pr?.deletions ?? 0} across ${pr?.changed_files ?? 0} file(s)\n\n`;

  if (Array.isArray(files)) {
    diffSummary += "Changed files:\n";
    for (const f of files.slice(0, 20)) {
      diffSummary += `\n--- ${f.filename} (${f.status}, +${f.additions} -${f.deletions})\n`;
      if (f.patch) diffSummary += f.patch.slice(0, 1500) + (f.patch.length > 1500 ? "\n...(truncated)" : "") + "\n";
    }
  }

  const prompt = `You are a senior software engineer performing a code review. Review the following pull request changes and provide:
1. A brief overall assessment (2-3 sentences)
2. Key findings (bugs, issues, improvements) as a bullet list
3. Specific suggestions for improvement
4. A final recommendation: APPROVE, REQUEST CHANGES, or COMMENT

${diffSummary}`;

  try {
    const res = await fetch(NIM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${nimKey}` },
      body: JSON.stringify({
        model: "meta/llama-3.3-70b-instruct",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1024,
        temperature: 0.2,
      }),
    });

    if (!res.ok) return NextResponse.json({ error: "AI request failed" }, { status: res.status });

    const data = await res.json();
    const review = data.choices?.[0]?.message?.content ?? "Unable to generate review.";
    return NextResponse.json({ review, generatedAt: new Date().toISOString() });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "AI request failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
