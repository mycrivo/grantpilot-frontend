"use client";

import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";

import { ProposalExtractionCheckpoint, proposalCheckpointFromJob } from "@/components/reports/ProposalExtractionCheckpoint";
import { ReportReadingHolding } from "@/components/reports/ReportReadingHolding";
import { ReportReadingProgress } from "@/components/reports/ReportReadingProgress";
import { ReportsFunnelHeader } from "@/components/reports/ReportsFunnelHeader";
import { ReportsJourneySteps } from "@/components/reports/ReportsJourneySteps";
import { ReportNotFound } from "@/components/reports/ReportNotFound";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { type ReportJobStatusResponse, listReportDocuments, resumeCritique } from "@/lib/api/reports";
import { ApiClientError } from "@/lib/api-client";
import { REPORT_JOB_STAGE, REPORT_JOB_STATUS } from "@/lib/me-enums";
import { resolveReportDetailSubpath, shouldPollReportJob } from "@/lib/report-detail-routing";
import {
  fetchReportRoutingContext,
  reportDispatchPath,
  useReportSubpathGuard,
} from "@/lib/report-subpath-guard";

const POLL_INTERVAL_MS = 3000;

type ReadingView = "pending" | "active" | "failed" | "holding" | "checkpoint";

type ReadingReportPageProps = {
  params: Promise<{ id: string }>;
};

export default function ReadingReportPage({ params }: ReadingReportPageProps) {
  const { id: reportId } = use(params);
  const router = useRouter();
  const guard = useReportSubpathGuard(reportId, "reading");
  const [readingView, setReadingView] = useState<ReadingView>("pending");
  const [displayJob, setDisplayJob] = useState<ReportJobStatusResponse | null>(null);
  const [documentFilenameById, setDocumentFilenameById] = useState<Record<string, string>>({});
  const [error, setError] = useState<ApiClientError | null>(null);

  const refresh = useCallback(async () => {
    try {
      const context = await fetchReportRoutingContext(reportId);

      if (
        context.job?.stage === REPORT_JOB_STAGE.CRITIQUE &&
        context.job.status === REPORT_JOB_STATUS.AWAITING_HUMAN
      ) {
        try {
          await resumeCritique(reportId);
        } catch (resumeError) {
          if (
            !(resumeError instanceof ApiClientError) ||
            resumeError.errorCode !== "CRITIQUE_ALREADY_COMPLETED"
          ) {
            throw resumeError;
          }
        }
        const refreshed = await fetchReportRoutingContext(reportId);
        context.report = refreshed.report;
        context.job = refreshed.job;
      }

      const resolved = resolveReportDetailSubpath(context.report, context.job);

      if (resolved !== "reading") {
        router.replace(reportDispatchPath(reportId));
        return false;
      }

      const checkpoint = proposalCheckpointFromJob(context.job);
      if (checkpoint) {
        try {
          const documents = await listReportDocuments(reportId);
          setDocumentFilenameById(
            Object.fromEntries(documents.documents.map((doc) => [doc.id, doc.original_filename])),
          );
        } catch {
          setDocumentFilenameById({});
        }
        setDisplayJob(context.job);
        setReadingView("checkpoint");
        setError(null);
        return false;
      }

      if (shouldPollReportJob(context.job, context.report)) {
        setDisplayJob(context.job);
        setReadingView("active");
        setError(null);
        return true;
      }

      if (context.job?.status === REPORT_JOB_STATUS.FAILED) {
        setDisplayJob(context.job);
        setReadingView("failed");
        setError(null);
        return false;
      }

      setDisplayJob(null);
      setReadingView("holding");
      setError(null);
      return false;
    } catch (loadError) {
      if (loadError instanceof ApiClientError && loadError.status === 404) {
        router.replace(reportDispatchPath(reportId));
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
    if (!guard.allowed) {
      return;
    }

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
  }, [guard.allowed, refresh]);

  if (guard.notFound) {
    return <ReportNotFound />;
  }

  if (guard.error) {
    return <ErrorDisplay title="Progress unavailable" error={guard.error} />;
  }

  if (error) {
    return <ErrorDisplay title="Progress unavailable" error={error} />;
  }

  if (guard.loading || !guard.allowed || readingView === "pending") {
    return <LoadingSkeleton variant="page" lines={6} />;
  }

  return (
    <section className="space-y-6">
      <ReportsFunnelHeader />
      <ReportsJourneySteps current="read" />
      {readingView === "holding" ? (
        <ReportReadingHolding />
      ) : readingView === "checkpoint" && displayJob ? (
        (() => {
          const checkpoint = proposalCheckpointFromJob(displayJob);
          return checkpoint ? (
            <ProposalExtractionCheckpoint
              reportId={reportId}
              checkpoint={checkpoint}
              documentFilenameById={documentFilenameById}
              onProceedStarted={() => router.replace(reportDispatchPath(reportId))}
            />
          ) : (
            <LoadingSkeleton variant="page" lines={6} />
          );
        })()
      ) : displayJob ? (
        <ReportReadingProgress job={displayJob} reportId={reportId} />
      ) : (
        <LoadingSkeleton variant="page" lines={6} />
      )}
    </section>
  );
}
