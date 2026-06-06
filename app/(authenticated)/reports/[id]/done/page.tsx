"use client";

import { use, useEffect, useState } from "react";

import { ReportExportSummary } from "@/components/reports/ReportExportSummary";
import { ReportsFunnelHeader } from "@/components/reports/ReportsFunnelHeader";
import { ReportsJourneySteps } from "@/components/reports/ReportsJourneySteps";
import { ReportNotFound } from "@/components/reports/ReportNotFound";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { getReport, type ReportDetailResponse } from "@/lib/api/reports";
import { ApiClientError } from "@/lib/api-client";

type DoneReportPageProps = {
  params: Promise<{ id: string }>;
};

export default function DoneReportPage({ params }: DoneReportPageProps) {
  const { id: reportId } = use(params);
  const [report, setReport] = useState<ReportDetailResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<ApiClientError | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const nextReport = await getReport(reportId);
        if (!cancelled) {
          setReport(nextReport);
          setError(null);
        }
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        if (loadError instanceof ApiClientError && loadError.status === 404) {
          setNotFound(true);
          return;
        }

        setError(
          loadError instanceof ApiClientError
            ? loadError
            : new ApiClientError(500, "Failed to load report summary."),
        );
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [reportId]);

  if (notFound) {
    return <ReportNotFound />;
  }

  if (error) {
    return <ErrorDisplay title="Report summary unavailable" error={error} />;
  }

  if (!report) {
    return <LoadingSkeleton variant="page" lines={8} />;
  }

  return (
    <section className="space-y-6">
      <ReportsFunnelHeader />
      <ReportsJourneySteps current="download" />
      <ReportExportSummary report={report} reportId={reportId} />
    </section>
  );
}
