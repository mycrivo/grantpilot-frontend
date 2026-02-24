"use client";

import Link from "next/link";

import { StatusBadge } from "@/components/shared/StatusBadge";

type FitScanRecommendation = "RECOMMENDED" | "APPLY_WITH_CAVEATS" | "NOT_RECOMMENDED";

type FitScanItem = {
  id: string;
  funding_opportunity_id: string;
  opportunity_title: string | null;
  overall_recommendation: FitScanRecommendation;
  model_rating: "STRONG" | "MODERATE" | "WEAK";
  subscores: {
    eligibility: number;
    alignment: number;
    readiness: number;
  };
  created_at: string;
};

type FitScanListProps = {
  items: FitScanItem[];
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

export function FitScanList({ items }: FitScanListProps) {
  return (
    <section className="card space-y-4">
      <h3>Recent Fit Scans</h3>
      {items.length === 0 ? (
        <p className="text-secondary">
          No fit scans yet. Start by checking fit for a funding opportunity on NGOInfo.org{" "}
          <a href="https://ngoinfo.org" target="_blank" rel="noreferrer" className="font-semibold text-brand-primary hover:underline">
            \u2192
          </a>
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-[8px] border border-brand-border p-3">
              <Link href={`/fit-scan/${encodeURIComponent(item.id)}`} className="space-y-2">
                <p className="font-semibold text-brand-text-primary">
                  {item.opportunity_title?.trim() ? item.opportunity_title : "Untitled opportunity"}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge label={item.overall_recommendation} status={item.overall_recommendation} />
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
