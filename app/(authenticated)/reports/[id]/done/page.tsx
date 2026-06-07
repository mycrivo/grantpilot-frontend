"use client";

import { use } from "react";

import { ReportExportSummary } from "@/components/reports/ReportExportSummary";
import { ReportsFunnelHeader } from "@/components/reports/ReportsFunnelHeader";
import { ReportsJourneySteps } from "@/components/reports/ReportsJourneySteps";
import { ReportNotFound } from "@/components/reports/ReportNotFound";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { useReportSubpathGuard } from "@/lib/report-subpath-guard";

type DoneReportPageProps = {
  params: Promise<{ id: string }>;
};

export default function DoneReportPage({ params }: DoneReportPageProps) {
  const { id: reportId } = use(params);
  const guard = useReportSubpathGuard(reportId, "done");

  if (guard.notFound) {
    return <ReportNotFound />;
  }

  if (guard.error) {
    return <ErrorDisplay title="Report summary unavailable" error={guard.error} />;
  }

  if (guard.loading || !guard.allowed || !guard.report) {
    return <LoadingSkeleton variant="page" lines={8} />;
  }

  return (
    <section className="space-y-6">
      <ReportsFunnelHeader />
      <ReportsJourneySteps current="download" />
      <ReportExportSummary report={guard.report} reportId={reportId} />
    </section>
  );
}
