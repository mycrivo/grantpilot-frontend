"use client";

import { useRouter } from "next/navigation";
import { use, useState } from "react";

import { ReportsQuotaExhausted } from "@/components/reports/ReportsQuotaExhausted";
import { ReportDocumentUpload } from "@/components/reports/ReportDocumentUpload";
import { ReportsFunnelHeader } from "@/components/reports/ReportsFunnelHeader";
import { ReportNotFound } from "@/components/reports/ReportNotFound";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { enqueueReportJob, reportReadingPath } from "@/lib/api/reports";
import { ApiClientError } from "@/lib/api-client";
import { useReportSubpathGuard } from "@/lib/report-subpath-guard";

type UploadReportPageProps = {
  params: Promise<{ id: string }>;
};

export default function UploadReportPage({ params }: UploadReportPageProps) {
  const { id: reportId } = use(params);
  const router = useRouter();
  const guard = useReportSubpathGuard(reportId, "upload");
  const [uploadedCount, setUploadedCount] = useState(0);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<ApiClientError | null>(null);
  const [quotaResetAt, setQuotaResetAt] = useState<string | null | undefined>(undefined);

  const handleStart = async () => {
    if (uploadedCount < 1) {
      return;
    }

    setStarting(true);
    setStartError(null);
    setQuotaResetAt(undefined);

    try {
      await enqueueReportJob(reportId);
      router.push(reportReadingPath(reportId));
    } catch (error) {
      if (error instanceof ApiClientError && (error.status === 429 || error.errorCode === "QUOTA_EXCEEDED")) {
        const resetAt = typeof error.details?.reset_at === "string" ? error.details.reset_at : null;
        setQuotaResetAt(resetAt);
        setStarting(false);
        return;
      }
      setStartError(
        error instanceof ApiClientError
          ? error
          : new ApiClientError(500, "Failed to start reading your documents. Please try again."),
      );
      setStarting(false);
    }
  };

  if (guard.notFound) {
    return <ReportNotFound />;
  }

  if (guard.error) {
    return <ErrorDisplay title="Report upload unavailable" error={guard.error} />;
  }

  if (guard.loading || !guard.allowed) {
    return <LoadingSkeleton variant="page" lines={6} />;
  }

  return (
    <section className="space-y-6">
      <ReportsFunnelHeader />

      <div className="max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center gap-2 text-sm text-secondary" role="list" aria-label="Report progress">
          {["Upload", "Read", "Facts", "Questions", "Review", "Download"].map((label, index) => (
            <div key={label} className="flex items-center gap-2" role="listitem">
              <span
                className={[
                  "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                  index === 0 ? "bg-brand-primary text-white" : "border border-brand-border text-secondary",
                ].join(" ")}
              >
                {index + 1}
              </span>
              <span className={index === 0 ? "font-semibold text-brand-text-primary" : ""}>{label}</span>
              {index < 5 ? <span className="hidden text-brand-border sm:inline">—</span> : null}
            </div>
          ))}
        </div>

        <header>
          <h1 className="text-[28px] font-bold leading-tight text-brand-text-primary">Upload your project documents</h1>
          <p className="mt-2 max-w-2xl text-[15px] text-secondary">
            Add what you have. Proposals, grant letters, results spreadsheets, photos, and notes are all useful.
          </p>
        </header>

        <ReportDocumentUpload reportId={reportId} onUploadedCountChange={setUploadedCount} />

        {quotaResetAt !== undefined ? <ReportsQuotaExhausted resetAt={quotaResetAt} /> : null}

        {startError ? <ErrorDisplay error={startError} /> : null}

        <div>
          <button
            type="button"
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
            disabled={starting || uploadedCount < 1}
            onClick={() => void handleStart()}
          >
            {starting ? "Starting…" : "Read my documents"}
          </button>
        </div>
      </div>
    </section>
  );
}
