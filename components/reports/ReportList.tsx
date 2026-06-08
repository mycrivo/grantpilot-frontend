import type { ReportListItem } from "@/lib/api/reports";
import { filterVisibleReportListItems } from "@/lib/report-sentinel-shell";

import { ReportCard } from "./ReportCard";

type ReportListProps = {
  items: ReportListItem[];
};

export function ReportList({ items }: ReportListProps) {
  const visibleItems = filterVisibleReportListItems(items);

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-brand-neutral">In progress &amp; recent</p>
      <ul className="space-y-3">
        {visibleItems.map((report) => (
          <li key={report.id}>
            <ReportCard report={report} />
          </li>
        ))}
      </ul>
    </div>
  );
}
