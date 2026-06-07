import Link from "next/link";

import type { ReportJobStatusResponse } from "@/lib/api/reports";
import { reportUploadPath } from "@/lib/api/reports";
import { REPORT_JOB_STATUS } from "@/lib/me-enums";

import {
  REPORT_DETAIL_ERROR_LABEL,
  REPORT_READING_FAILED_LABEL,
  resolveReportJobProgressHeadline,
  resolveReportReadingWorkSteps,
  type ReportReadingWorkStep,
} from "./report-status-labels";

type ReportReadingProgressProps = {
  job: ReportJobStatusResponse;
  reportId: string;
};

function workStepClasses(state: ReportReadingWorkStep["state"]): string {
  if (state === "done") {
    return "text-brand-success";
  }
  if (state === "current") {
    return "text-brand-primary";
  }
  return "text-secondary";
}

function workStepStateLabel(state: ReportReadingWorkStep["state"]): string {
  if (state === "done") {
    return "Done";
  }
  if (state === "current") {
    return "In progress";
  }
  return "Next";
}

export function ReportReadingProgress({ job, reportId }: ReportReadingProgressProps) {
  const hasError = job.status === REPORT_JOB_STATUS.FAILED;
  const headline = hasError
    ? REPORT_DETAIL_ERROR_LABEL.READING_FAILED
    : resolveReportJobProgressHeadline(job.stage);
  const workSteps = resolveReportReadingWorkSteps(job.stage);

  return (
    <div className="mx-auto max-w-xl space-y-6 text-center">
      <header>
        <h1 className="text-[28px] font-bold leading-tight text-brand-text-primary">{headline}</h1>
        {!hasError ? (
          <p className="mt-2 text-[15px] text-secondary">
            This can take a minute or two. You can leave this page and come back later.
          </p>
        ) : null}
      </header>

      {hasError ? (
        <div className="space-y-4 text-left">
          <div className="rounded-[12px] border border-brand-error/30 bg-brand-error/5 p-4">
            <p className="text-sm text-secondary">{REPORT_DETAIL_ERROR_LABEL.READING_FAILED_BODY}</p>
          </div>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href={reportUploadPath(reportId)} className="btn-primary inline-flex min-h-10 items-center px-6">
              {REPORT_READING_FAILED_LABEL.START_OVER}
            </Link>
            <Link href="/reports" className="text-sm font-semibold text-brand-primary hover:underline">
              {REPORT_READING_FAILED_LABEL.BACK_TO_REPORTS}
            </Link>
          </div>
        </div>
      ) : (
        <ul className="space-y-3 text-left">
          {workSteps.map((step) => (
            <li
              key={step.label}
              className="flex items-center gap-3 rounded-[8px] border border-brand-border bg-brand-card-bg px-4 py-3"
            >
              <span className={workStepClasses(step.state)} aria-hidden="true">
                {step.state === "done" ? "✓" : step.state === "current" ? "●" : "○"}
              </span>
              <span className="min-w-0 flex-1 font-medium text-brand-text-primary">{step.label}</span>
              <span className={`text-sm capitalize ${workStepClasses(step.state)}`}>
                {workStepStateLabel(step.state)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {!hasError ? (
        <p className="flex items-start justify-center gap-2 text-sm text-secondary">
          <span aria-hidden="true">✉</span>
          <span>We&apos;ll email you when your report is ready for review.</span>
        </p>
      ) : null}
    </div>
  );
}
