"use client";

import { GATE1_LABEL } from "@/components/reports/report-status-labels";

type Gate1DegradedBannerProps = {
  rawFactCount: number;
  displayFactCount: number;
};

export function Gate1DegradedBanner({ rawFactCount, displayFactCount }: Gate1DegradedBannerProps) {
  const collapsed = rawFactCount - displayFactCount;

  return (
    <div
      className="rounded-[12px] border border-brand-warning/30 bg-brand-warning/5 px-4 py-3"
      role="status"
    >
      <p className="font-semibold text-brand-text-primary">{GATE1_LABEL.DEGRADED_HEADING}</p>
      <p className="mt-1 text-sm text-secondary">{GATE1_LABEL.DEGRADED_BODY}</p>
      {collapsed > 0 ? (
        <p className="mt-2 text-xs text-secondary">
          {collapsed} identical {collapsed === 1 ? "duplicate was" : "duplicates were"} hidden after grouping.
        </p>
      ) : null}
    </div>
  );
}
