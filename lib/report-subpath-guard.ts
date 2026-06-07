/**
 * Sub-page stage guard — defers to resolveReportDetailSubpath (same logic as /reports/{id} dispatcher).
 */

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getReport, getReportJob, type ReportDetailResponse, type ReportJobStatusResponse } from "@/lib/api/reports";
import { ApiClientError } from "@/lib/api-client";
import { DONOR_REPORT_STATUS, REPORT_JOB_STATUS } from "@/lib/me-enums";
import { resolveReportDetailSubpath, type ReportDetailSubpath } from "@/lib/report-detail-routing";

export async function fetchReportRoutingContext(reportId: string): Promise<{
  report: ReportDetailResponse;
  job: ReportJobStatusResponse | null;
}> {
  const report = await getReport(reportId);
  let job: ReportJobStatusResponse | null = null;

  try {
    job = await getReportJob(reportId);
  } catch (error) {
    if (!(error instanceof ApiClientError && error.status === 404)) {
      throw error;
    }
  }

  return { report, job };
}

export function reportDispatchPath(reportId: string): string {
  return `/reports/${encodeURIComponent(reportId)}`;
}

export type ReportSubpathGuardState = {
  loading: boolean;
  notFound: boolean;
  error: ApiClientError | null;
  report: ReportDetailResponse | null;
  job: ReportJobStatusResponse | null;
  allowed: boolean;
};

export function useReportSubpathGuard(
  reportId: string,
  expectedSubpath: ReportDetailSubpath,
): ReportSubpathGuardState {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [report, setReport] = useState<ReportDetailResponse | null>(null);
  const [job, setJob] = useState<ReportJobStatusResponse | null>(null);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setAllowed(false);
    setNotFound(false);
    setError(null);
    setReport(null);
    setJob(null);

    const run = async () => {
      try {
        const context = await fetchReportRoutingContext(reportId);
        if (cancelled) {
          return;
        }

        const resolved = resolveReportDetailSubpath(context.report, context.job);
        const uploadAllowedAfterFailure =
          expectedSubpath === "upload" &&
          context.job?.status === REPORT_JOB_STATUS.FAILED &&
          context.report.status === DONOR_REPORT_STATUS.DRAFT;

        if (resolved !== expectedSubpath && !uploadAllowedAfterFailure) {
          router.replace(reportDispatchPath(reportId));
          return;
        }

        setReport(context.report);
        setJob(context.job);
        setAllowed(true);
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
            : new ApiClientError(500, "Failed to load this report."),
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [reportId, expectedSubpath, router]);

  return { loading, notFound, error, report, job, allowed };
}
