"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

import { ReportNotFound } from "@/components/reports/ReportNotFound";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { getReport, getReportJob } from "@/lib/api/reports";
import { ApiClientError } from "@/lib/api-client";
import { resolveReportDetailSubpath } from "@/lib/report-detail-routing";

type ReportDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function ReportDetailPage({ params }: ReportDetailPageProps) {
  const { id: reportId } = use(params);
  const router = useRouter();
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<ApiClientError | null>(null);

  useEffect(() => {
    let cancelled = false;

    const dispatch = async () => {
      setNotFound(false);
      setError(null);

      try {
        const report = await getReport(reportId);
        let job = null;

        try {
          job = await getReportJob(reportId);
        } catch (jobError) {
          if (!(jobError instanceof ApiClientError && jobError.status === 404)) {
            throw jobError;
          }
        }

        if (cancelled) {
          return;
        }

        const subpath = resolveReportDetailSubpath(report, job);
        router.replace(`/reports/${encodeURIComponent(reportId)}/${subpath}`);
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
            : new ApiClientError(500, "Failed to open this report."),
        );
      }
    };

    void dispatch();

    return () => {
      cancelled = true;
    };
  }, [reportId, router]);

  if (notFound) {
    return <ReportNotFound />;
  }

  if (error) {
    return <ErrorDisplay title="Report unavailable" error={error} />;
  }

  return <LoadingSkeleton variant="page" lines={6} />;
}
