/**
 * Authoritative-state routing for /reports/{id} — API_CONTRACT.md §12.12.
 * Uses getReportJob stage/status (+ report.status for terminal states), NOT report.current_gate.
 */

import type { ReportDetailResponse, ReportJobStatusResponse } from "@/lib/api/reports";
import {
  CURRENT_GATE,
  DONOR_REPORT_STATUS,
  REPORT_JOB_STAGE,
  REPORT_JOB_STATUS,
  type CurrentGate,
  type ReportJobStage,
} from "@/lib/me-enums";

export type ReportDetailSubpath = "upload" | "reading" | "facts" | "questions" | "review" | "done";

const EXTRACTING_STAGES: ReportJobStage[] = [
  REPORT_JOB_STAGE.CLASSIFY,
  REPORT_JOB_STAGE.EXTRACT,
  REPORT_JOB_STAGE.RECONCILE,
];

const GENERATING_STAGES: ReportJobStage[] = [
  REPORT_JOB_STAGE.GAP,
  REPORT_JOB_STAGE.SYNTHESISE,
  REPORT_JOB_STAGE.CRITIQUE,
  REPORT_JOB_STAGE.EXPORT,
];

function isActiveJob(job: ReportJobStatusResponse): boolean {
  return job.status === REPORT_JOB_STATUS.QUEUED || job.status === REPORT_JOB_STATUS.RUNNING;
}

function resolveGateSubpath(currentGate: CurrentGate): ReportDetailSubpath {
  if (currentGate === CURRENT_GATE.GATE1) {
    return "facts";
  }
  if (currentGate === CURRENT_GATE.GATE2) {
    return "questions";
  }
  if (currentGate === CURRENT_GATE.GATE3) {
    return "review";
  }
  return "reading";
}

/** Backend job API does not return current_gate — map stage cursor per pipeline halt semantics. */
function resolveAwaitingHumanSubpath(
  job: ReportJobStatusResponse,
  report: ReportDetailResponse,
): ReportDetailSubpath {
  // #region agent log
  fetch("http://127.0.0.1:7731/ingest/4e17683d-a53a-4b2f-befb-0a2025f75c7e", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "1949da" },
    body: JSON.stringify({
      sessionId: "1949da",
      hypothesisId: "H1-H2",
      location: "report-detail-routing.ts:resolveAwaitingHumanSubpath",
      message: "awaiting_human routing inputs",
      data: {
        jobStage: job.stage,
        jobStatus: job.status,
        jobCurrentGate: job.current_gate ?? null,
        reportCurrentGate: report.current_gate,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  if (job.stage === REPORT_JOB_STAGE.GAP) {
    return "facts";
  }
  if (job.stage === REPORT_JOB_STAGE.SYNTHESISE) {
    return "questions";
  }
  if (job.stage === REPORT_JOB_STAGE.EXPORT) {
    return "review";
  }
  if (job.stage === REPORT_JOB_STAGE.CRITIQUE) {
    return report.current_gate === CURRENT_GATE.GATE3 ? "review" : "questions";
  }

  if (job.current_gate && job.current_gate !== CURRENT_GATE.NONE) {
    return resolveGateSubpath(job.current_gate);
  }
  if (report.current_gate !== CURRENT_GATE.NONE) {
    return resolveGateSubpath(report.current_gate);
  }
  return "reading";
}

/** Map authoritative job + report state to the detail sub-route segment. */
export function resolveReportDetailSubpath(
  report: ReportDetailResponse,
  job: ReportJobStatusResponse | null,
): ReportDetailSubpath {
  if (report.status === DONOR_REPORT_STATUS.COMPLETE) {
    return "done";
  }

  if (!job) {
    if (report.status === DONOR_REPORT_STATUS.DRAFT) {
      return "upload";
    }
    if (report.status === DONOR_REPORT_STATUS.DEGRADED) {
      return "done";
    }
    if (report.current_gate !== CURRENT_GATE.NONE) {
      return resolveGateSubpath(report.current_gate);
    }
    return "reading";
  }

  if (job.status === REPORT_JOB_STATUS.FAILED) {
    return "reading";
  }

  if (job.status === REPORT_JOB_STATUS.AWAITING_HUMAN) {
    const subpath = resolveAwaitingHumanSubpath(job, report);
    // #region agent log
    fetch("http://127.0.0.1:7731/ingest/4e17683d-a53a-4b2f-befb-0a2025f75c7e", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "1949da" },
      body: JSON.stringify({
        sessionId: "1949da",
        hypothesisId: "H1",
        location: "report-detail-routing.ts:resolveReportDetailSubpath",
        message: "resolved awaiting_human subpath",
        data: { subpath, jobStage: job.stage },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return subpath;
  }

  if (job.status === REPORT_JOB_STATUS.DONE) {
    if (report.status === DONOR_REPORT_STATUS.DEGRADED) {
      return "done";
    }
    if (report.status === DONOR_REPORT_STATUS.AWAITING_REVIEW) {
      return resolveAwaitingHumanSubpath(job, report);
    }
    return "done";
  }

  if (isActiveJob(job)) {
    if (EXTRACTING_STAGES.includes(job.stage) || GENERATING_STAGES.includes(job.stage)) {
      return "reading";
    }
    return "reading";
  }

  if (report.status === DONOR_REPORT_STATUS.DEGRADED) {
    return "done";
  }

  return "reading";
}

/** Poll while the pipeline job is actively running; stop on halt, terminal, or error. */
export function shouldPollReportJob(
  job: ReportJobStatusResponse | null,
  report: ReportDetailResponse,
): boolean {
  if (!job) {
    return false;
  }

  if (job.status === REPORT_JOB_STATUS.FAILED) {
    return false;
  }

  if (job.status === REPORT_JOB_STATUS.AWAITING_HUMAN) {
    return false;
  }

  if (job.status === REPORT_JOB_STATUS.DONE) {
    return false;
  }

  if (report.status === DONOR_REPORT_STATUS.COMPLETE) {
    return false;
  }

  if (
    report.status === DONOR_REPORT_STATUS.DEGRADED &&
    job.status !== REPORT_JOB_STATUS.QUEUED &&
    job.status !== REPORT_JOB_STATUS.RUNNING
  ) {
    return false;
  }

  return isActiveJob(job);
}

export function isReportDegraded(report: ReportDetailResponse): boolean {
  return report.status === DONOR_REPORT_STATUS.DEGRADED;
}

export function isExtractingStage(stage: ReportJobStage): boolean {
  return EXTRACTING_STAGES.includes(stage);
}

export function isGeneratingStage(stage: ReportJobStage): boolean {
  return GENERATING_STAGES.includes(stage);
}
