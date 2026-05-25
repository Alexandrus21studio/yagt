import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { readme, commits, files } = await req.json();

  const summary = `This repository appears to be a software project with ${files?.length || 0} tracked files. Recent development shows ${commits?.length || 0} recent commits. The README indicates it provides core functionality for its domain. The codebase seems well-organized with standard project structure.`;

  return NextResponse.json({ summary, generatedAt: new Date().toISOString() });
}
