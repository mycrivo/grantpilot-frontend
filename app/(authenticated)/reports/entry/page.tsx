import Link from "next/link";

import { PATH_C_LABEL } from "@/components/reports/report-status-labels";
import { ReportsFunnelHeader } from "@/components/reports/ReportsFunnelHeader";

export default function ReportsEntryPage() {
  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <ReportsFunnelHeader />

      <header>
        <h1 className="text-[28px] font-bold leading-tight text-brand-text-primary">{PATH_C_LABEL.TITLE}</h1>
        <p className="mt-2 text-[15px] text-secondary">{PATH_C_LABEL.SUBTITLE}</p>
      </header>

      <p className="text-[15px] text-secondary">{PATH_C_LABEL.BODY}</p>

      <div className="flex flex-wrap items-center gap-4">
        <Link href="/reports/new" className="btn-primary inline-flex">
          {PATH_C_LABEL.CTA}
        </Link>
        <Link href="/reports" className="text-sm font-semibold text-brand-primary hover:underline">
          {PATH_C_LABEL.VIEW_REPORTS}
        </Link>
      </div>
    </section>
  );
}
