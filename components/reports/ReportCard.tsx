import Link from "next/link";

import { StatusBadge } from "@/components/shared/StatusBadge";
import type { ReportListItem } from "@/lib/api/reports";

import { resolveReportListStatusChip } from "./report-status-labels";

type ReportCardProps = {
  report: ReportListItem;
};

function formatReportingPeriod(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return `${start} – ${end}`;
  }
  const formatter = new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" });
  return `${formatter.format(startDate)} – ${formatter.format(endDate)}`;
}

function formatLastUpdated(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  if (diffMin < 1) {
    return "Today";
  }
  if (diffMin < 60) {
    return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return "Yesterday";
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function ReportCard({ report }: ReportCardProps) {
  const chip = resolveReportListStatusChip(report.status, report.current_gate);
  const reportHref = `/reports/${encodeURIComponent(report.id)}`;

  return (
    <article className="flex flex-col gap-4 rounded-[12px] border border-brand-border bg-brand-card-bg p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-bold text-brand-text-primary">{report.template_name}</h3>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-secondary">
          <span>
            <span className="font-semibold text-brand-text-primary">{report.funder_name}</span>
          </span>
          <span>
            Reporting period{" "}
            <span className="font-semibold text-brand-text-primary">
              {formatReportingPeriod(report.reporting_period_start, report.reporting_period_end)}
            </span>
          </span>
          <span>
            Last updated{" "}
            <span className="font-semibold text-brand-text-primary">{formatLastUpdated(report.updated_at)}</span>
          </span>
        </div>
      </div>
      <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:flex-col sm:items-end">
        <StatusBadge label={chip.label} tone={chip.tone} />
        <Link
          href={reportHref}
          className="inline-flex min-h-10 items-center rounded-[8px] border border-brand-primary bg-transparent px-4 py-2 text-sm font-semibold text-brand-primary hover:bg-brand-primary/5"
        >
          {chip.cta}
        </Link>
      </div>
    </article>
  );
}
