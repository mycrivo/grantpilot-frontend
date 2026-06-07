import Link from "next/link";

import { REPORT_DETAIL_ERROR_LABEL } from "./report-status-labels";

export function ReportNotFound() {
  return (
    <section className="mx-auto max-w-2xl">
      <div className="rounded-[12px] border border-brand-error/30 bg-brand-error/5 p-5">
        <div className="flex gap-3">
          <span className="text-lg font-bold text-brand-error" aria-hidden="true">
            !
          </span>
          <div>
            <h1 className="text-lg font-semibold text-brand-text-primary">{REPORT_DETAIL_ERROR_LABEL.NOT_FOUND}</h1>
            <p className="mt-2 text-sm text-secondary">{REPORT_DETAIL_ERROR_LABEL.NOT_FOUND_BODY}</p>
            <Link href="/reports" className="btn-primary mt-4 inline-flex">
              Back to M&E Reports
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
