"use client";

import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";

import { ReportReadingProgress } from "@/components/reports/ReportReadingProgress";
import { ReportsFunnelHeader } from "@/components/reports/ReportsFunnelHeader";
import { ReportsJourneySteps } from "@/components/reports/ReportsJourneySteps";
import { ReportNotFound } from "@/components/reports/ReportNotFound";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { getReport, getReportJob, type ReportJobStatusResponse } from "@/lib/api/reports";
import { ApiClientError } from "@/lib/api-client";
import { resolveReportDetailSubpath, shouldPollReportJob } from "@/lib/report-detail-routing";

const POLL_INTERVAL_MS = 3000;

type ReadingReportPageProps = {
  params: Promise<{ id: string }>;
};

export default function ReadingReportPage({ params }: ReadingReportPageProps) {
  const { id: reportId } = use(params);
  const router = useRouter();
  const [job, setJob] = useState<ReportJobStatusResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<ApiClientError | null>(null);

  const refresh = useCallback(async () => {
    try {
      const report = await getReport(reportId);
      let nextJob: ReportJobStatusResponse | null = null;

      try {
        nextJob = await getReportJob(reportId);
      } catch (jobError) {
        if (jobError instanceof ApiClientError && jobError.status === 404) {
          nextJob = null;
        } else {
          throw jobError;
        }
      }

      if (!shouldPollReportJob(nextJob, report)) {
        const subpath = resolveReportDetailSubpath(report, nextJob);
        router.replace(`/reports/${encodeURIComponent(reportId)}/${subpath}`);
        return false;
      }

      setJob(nextJob);
      setError(null);
      return true;
    } catch (loadError) {
      if (loadError instanceof ApiClientError && loadError.status === 404) {
        setNotFound(true);
        return false;
      }

      setError(
        loadError instanceof ApiClientError
          ? loadError
          : new ApiClientError(500, "Failed to load report progress."),
      );
      return false;
    }
  }, [reportId, router]);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startPolling = async () => {
      const shouldContinue = await refresh();
      if (!shouldContinue || cancelled) {
        return;
      }

      intervalId = setInterval(() => {
        void refresh();
      }, POLL_INTERVAL_MS);
    };

    void startPolling();

    return () => {
      cancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [refresh]);

  if (notFound) {
    return <ReportNotFound />;
  }

  if (error) {
    return <ErrorDisplay title="Progress unavailable" error={error} />;
  }

  if (!job) {
    return <LoadingSkeleton variant="page" lines={6} />;
  }

  return (
    <section className="space-y-6">
      <ReportsFunnelHeader />
      <ReportsJourneySteps current="read" />
      <ReportReadingProgress job={job} />
    </section>
  );
}
