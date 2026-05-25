import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";

const GITHUB_BASE = "https://api.github.com";

async function getToken(userId: string | null) {
  let token = process.env.GITHUB_TOKEN;
  if (userId) {
    try {
      const client = await clerkClient();
      const tokens = await client.users.getUserOauthAccessToken(userId, "oauth_github");
      if (tokens.data[0]?.token) token = tokens.data[0].token;
    } catch { /* fall back */ }
  }
  return token;
}

async function proxyRequest(request: NextRequest, params: Promise<{ path: string[] }>, method: string, body?: unknown) {
  const { path } = await params;
  const { userId } = await auth();
  const token = await getToken(userId);

  const endpoint = "/" + path.join("/");
  const search = request.nextUrl.search;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "yagt-web",
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `token ${token}`;

  try {
    const res = await fetch(`${GITHUB_BASE}${endpoint}${search}`, {
      method,
      headers,
      cache: "no-store",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "GitHub proxy error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, params, "GET");
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const body = await request.json().catch(() => undefined);
  return proxyRequest(request, params, "POST", body);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const body = await request.json().catch(() => undefined);
  return proxyRequest(request, params, "PUT", body);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const body = await request.json().catch(() => undefined);
  return proxyRequest(request, params, "DELETE", body);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const body = await request.json().catch(() => undefined);
  return proxyRequest(request, params, "PATCH", body);
}
