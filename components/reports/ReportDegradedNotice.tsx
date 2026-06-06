import { REPORT_DEGRADED_LABEL } from "./report-status-labels";

type ReportDegradedNoticeProps = {
  failedSectionCount?: number;
};

export function ReportDegradedNotice({ failedSectionCount }: ReportDegradedNoticeProps) {
  return (
    <div className="rounded-[12px] border border-brand-warning/30 bg-brand-warning/5 p-4">
      <h2 className="font-semibold text-brand-text-primary">{REPORT_DEGRADED_LABEL.TITLE}</h2>
      <p className="mt-2 text-sm text-secondary">
        {REPORT_DEGRADED_LABEL.BODY}
        {typeof failedSectionCount === "number" && failedSectionCount > 0
          ? ` ${failedSectionCount} section${failedSectionCount === 1 ? "" : "s"} could not be completed.`
          : null}
      </p>
    </div>
  );
}
