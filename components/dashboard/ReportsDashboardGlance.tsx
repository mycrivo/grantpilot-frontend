import Link from "next/link";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { DASHBOARD_REPORTS_LABEL, resolveReportListStatusChip } from "@/components/reports/report-status-labels";
import type { ReportListItem } from "@/lib/api/reports";

type ReportsDashboardGlanceProps = {
  reports: ReportListItem[];
};

export function ReportsDashboardGlance({ reports }: ReportsDashboardGlanceProps) {
  return (
    <section className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3>{DASHBOARD_REPORTS_LABEL.TITLE}</h3>
        <Link href="/reports" className="text-sm font-semibold text-brand-primary hover:underline">
          {DASHBOARD_REPORTS_LABEL.VIEW_ALL}
        </Link>
      </div>

      {reports.length === 0 ? (
        <p className="text-secondary">{DASHBOARD_REPORTS_LABEL.EMPTY}</p>
      ) : (
        <ul className="space-y-3">
          {reports.map((report) => {
            const chip = resolveReportListStatusChip(report.status, report.current_gate);
            return (
              <li key={report.id} className="rounded-[8px] border border-brand-border p-3">
                <Link href={`/reports/${encodeURIComponent(report.id)}`} className="space-y-2">
                  <p className="font-semibold text-brand-text-primary">{report.template_name}</p>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-secondary">
                    <span>{report.funder_name}</span>
                    <StatusBadge label={chip.label} tone={chip.tone} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-4 pt-1">
        <Link href="/reports/new" className="btn-primary inline-flex text-sm">
          {DASHBOARD_REPORTS_LABEL.START_CTA}
        </Link>
        <Link href="/reports/entry" className="text-sm font-semibold text-brand-primary hover:underline">
          {DASHBOARD_REPORTS_LABEL.PATH_C_LINK}
        </Link>
      </div>
    </section>
  );
}
