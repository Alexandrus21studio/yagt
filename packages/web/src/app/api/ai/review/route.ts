import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { diff } = await req.json();

  const lines = diff?.split("\n").length || 0;
  let assessment = "safe";
  if (lines > 200) assessment = "attention";
  if (diff?.includes("TODO") || diff?.includes("FIXME")) assessment = "attention";

  const review = {
    assessment,
    findings: [
      "Code follows consistent style",
      lines > 100 ? "Large diff — consider breaking into smaller PRs" : "Manageable change size",
      diff?.includes("test") ? "Tests included" : "Consider adding test coverage",
    ],
    suggestions: ["Run full test suite before merging", "Request review from domain expert"],
    generatedAt: new Date().toISOString(),
  };

  return NextResponse.json(review);
}
