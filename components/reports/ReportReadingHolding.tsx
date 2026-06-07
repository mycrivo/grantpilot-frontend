import Link from "next/link";

import { REPORT_READING_HOLDING_LABEL } from "./report-status-labels";

export function ReportReadingHolding() {
  return (
    <div className="mx-auto max-w-xl space-y-6 text-center">
      <header>
        <h1 className="text-[28px] font-bold leading-tight text-brand-text-primary">
          {REPORT_READING_HOLDING_LABEL.TITLE}
        </h1>
        <p className="mt-2 text-[15px] text-secondary">{REPORT_READING_HOLDING_LABEL.BODY}</p>
      </header>

      <p className="flex items-start justify-center gap-2 text-sm text-secondary">
        <span aria-hidden="true">✉</span>
        <span>We&apos;ll email you when your report is ready for review.</span>
      </p>

      <Link
        href="/reports"
        className="inline-flex min-h-10 items-center rounded-[8px] border border-brand-border px-4 py-2 text-sm font-semibold text-brand-primary hover:bg-brand-primary/5"
      >
        {REPORT_READING_HOLDING_LABEL.BACK_TO_REPORTS}
      </Link>
    </div>
  );
}
