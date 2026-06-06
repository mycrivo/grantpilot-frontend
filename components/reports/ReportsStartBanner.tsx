import Link from "next/link";

export function ReportsStartBanner() {
  return (
    <div className="mb-6 flex flex-col gap-4 rounded-[12px] border border-brand-border bg-brand-card-bg p-5 shadow-sm sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-brand-text-primary">Ready to report back to a funder?</p>
        <p className="mt-1 text-sm text-secondary">
          GrantPilot turns your documents, results, and notes into a structured donor report.
        </p>
      </div>
      <Link href="/reports/new" className="btn-primary inline-flex w-full items-center justify-center sm:w-auto">
        Start new report
      </Link>
    </div>
  );
}
