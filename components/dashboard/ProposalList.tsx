"use client";

import Link from "next/link";

import { StatusBadge } from "@/components/shared/StatusBadge";

type ProposalItem = {
  id: string;
  funding_opportunity_id: string;
  fit_scan_id: string | null;
  opportunity_title: string | null;
  status: "DRAFT" | "DEGRADED";
  version: number;
  created_at: string;
  updated_at: string;
  generation_summary: {
    total_items: number;
    generated: number;
    failed: number;
    manual_required: number;
    warnings: string[];
  };
};

type ProposalListProps = {
  items: ProposalItem[];
};

function relativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  if (diffMin < 1) {
    return "Just now";
  }
  if (diffMin < 60) {
    return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

export function ProposalList({ items }: ProposalListProps) {
  return (
    <section className="card space-y-4">
      <h3>Recent Proposals</h3>
      {items.length === 0 ? (
        <p className="text-secondary">No proposals yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-[8px] border border-brand-border p-3">
              <Link href={`/proposal/${encodeURIComponent(item.id)}`} className="space-y-2">
                <p className="font-semibold text-brand-text-primary">
                  {item.opportunity_title?.trim() ? item.opportunity_title : "Untitled opportunity"}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge label={item.status} tone={item.status === "DRAFT" ? "success" : "warning"} />
                  <span className="text-sm text-secondary">
                    {item.generation_summary.generated}/{item.generation_summary.total_items} sections generated
                  </span>
                  <span className="text-sm text-secondary">{relativeTime(item.created_at)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
