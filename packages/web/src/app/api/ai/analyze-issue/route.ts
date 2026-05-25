import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, body } = await req.json();

  const lower = (title + " " + (body || "")).toLowerCase();
  let severity = "medium";
  if (lower.includes("crash") || lower.includes("memory leak") || lower.includes("security")) severity = "high";
  if (lower.includes("typo") || lower.includes("docs") || lower.includes("readme")) severity = "low";

  const analysis = {
    summary: `Issue relates to ${title.toLowerCase().includes("fix") ? "a bug or problem" : "a feature or improvement request"}.`,
    severity,
    labels: severity === "high" ? ["bug", "priority"] : severity === "low" ? ["docs", "good first issue"] : ["triage"],
    suggestion: "Review the issue description and assign to the relevant maintainer.",
    generatedAt: new Date().toISOString(),
  };

  return NextResponse.json(analysis);
}
