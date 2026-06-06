import type { ReportJobStatusResponse } from "@/lib/api/reports";
import { REPORT_JOB_STATUS } from "@/lib/me-enums";

import {
  REPORT_DETAIL_ERROR_LABEL,
  resolveReportJobProgressHeadline,
  resolveReportReadingWorkSteps,
  type ReportReadingWorkStep,
} from "./report-status-labels";

type ReportReadingProgressProps = {
  job: ReportJobStatusResponse;
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

export function ReportReadingProgress({ job }: ReportReadingProgressProps) {
  const headline = resolveReportJobProgressHeadline(job.stage);
  const workSteps = resolveReportReadingWorkSteps(job.stage);
  const hasError = job.status === REPORT_JOB_STATUS.FAILED;

  return (
    <div className="mx-auto max-w-xl space-y-6 text-center">
      <header>
        <h1 className="text-[28px] font-bold leading-tight text-brand-text-primary">{headline}</h1>
        <p className="mt-2 text-[15px] text-secondary">
          This can take a minute or two. You can leave this page and come back later.
        </p>
      </header>

      {hasError ? (
        <div className="rounded-[12px] border border-brand-error/30 bg-brand-error/5 p-4 text-left">
          <h2 className="font-semibold text-brand-text-primary">{REPORT_DETAIL_ERROR_LABEL.READING_FAILED}</h2>
          <p className="mt-2 text-sm text-secondary">{REPORT_DETAIL_ERROR_LABEL.READING_FAILED_BODY}</p>
          {job.error ? <p className="mt-2 text-sm text-secondary">{job.error}</p> : null}
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
              <span className={`text-sm capitalize ${workStepClasses(step.state)}`}>{workStepStateLabel(step.state)}</span>
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
