"use client";

import { useParams } from "next/navigation";
import { AlertCircle } from "lucide-react";

export default function IssuesPage() {
  const params = useParams();
  const owner = params.owner as string;
  const name = params.name as string;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {owner}/{name} — Issues
        </h1>
        <button className="btn btn-sm btn-primary">New issue</button>
      </div>

      <div className="card card-bordered card-compact bg-base-200">
        <div className="card-body items-center text-center">
          <AlertCircle size={32} className="text-base-content/70 mb-2" />
          <p className="text-base-content/70">No issues found.</p>
        </div>
      </div>
    </div>
  );
}
