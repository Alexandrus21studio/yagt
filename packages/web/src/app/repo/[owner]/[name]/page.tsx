"use client";

import { useParams } from "next/navigation";
import { GitBranch, Star, GitFork, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function RepoPage() {
  const params = useParams();
  const owner = params.owner as string;
  const name = params.name as string;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-xl font-semibold">
            {owner} / {name}
          </h1>
          <span className="badge badge-outline badge-sm">Public</span>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap">
        <span className="flex items-center gap-1 text-[13px]">
          <GitBranch size={14} /> main
        </span>
        <span className="flex items-center gap-1 text-[13px]">
          <Star size={14} /> 0
        </span>
        <span className="flex items-center gap-1 text-[13px]">
          <GitFork size={14} /> 0
        </span>
        <span className="flex items-center gap-1 text-[13px]">
          <AlertCircle size={14} /> 0 issues
        </span>
      </div>

      <div className="grid grid-cols-[2fr_1fr] gap-5">
        <div className="flex flex-col gap-4">
          <div className="card card-bordered card-compact bg-base-200 overflow-hidden">
            <div className="tabs tabs-bordered gap-4 px-4 py-3 text-sm">
              <Link
                href={`/repo/${owner}/${name}`}
                className="tab tab-active"
              >
                Code
              </Link>
              <Link
                href={`/repo/${owner}/${name}/issues`}
                className="tab"
              >
                Issues
              </Link>
              <Link
                href={`/repo/${owner}/${name}/pulls`}
                className="tab"
              >
                Pull requests
              </Link>
              <Link
                href={`/repo/${owner}/${name}/ai`}
                className="tab text-primary"
              >
                AI Assistant
              </Link>
            </div>

            <div className="card-body">
              <p className="text-base-content/70 text-sm">
                No files to display.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="card card-bordered card-compact bg-base-200">
            <div className="card-body">
              <h3 className="text-sm font-semibold mb-3">Recent Commits</h3>
              <p className="text-[13px] text-base-content/70">
                No commits yet.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
