import Link from "next/link";

export function ReportsEmptyState() {
  return (
    <div className="rounded-[12px] border border-dashed border-brand-border bg-brand-card-bg px-6 py-14 text-center">
      <div
        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[14px] bg-brand-primary/10 text-2xl text-brand-primary"
        aria-hidden="true"
      >
        ▤
      </div>
      <h2 className="text-xl font-bold text-brand-text-primary">No reports yet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-secondary">
        When you need to report back to a funder, GrantPilot helps you turn your documents, results, and notes into a
        structured M&E report.
      </p>
      <Link href="/reports/new" className="btn-primary mt-6 inline-flex items-center">
        Start your first report
      </Link>
    </div>
  );
}
