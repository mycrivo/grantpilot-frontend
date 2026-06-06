/**
 * Plain-language M&E status labels — ME_MODULE_REPORTS_NGO_UI.html header map + Screens 5/9.
 * Keys off lib/me-enums.ts values only; no ad-hoc status string literals elsewhere.
 */

import {
  CURRENT_GATE,
  DONOR_REPORT_STATUS,
  REPORT_JOB_STAGE,
  type CurrentGate,
  type DonorReportStatus,
  type ReportJobStage,
} from "@/lib/me-enums";

export const REPORT_LIST_STATUS_LABEL = {
  READING_DOCUMENTS: "Reading documents",
  NEEDS_YOUR_REVIEW: "Needs your review",
  DRAFT_READY: "Draft ready",
  READY_TO_DOWNLOAD: "Ready to download",
  DOWNLOADED: "Downloaded",
} as const;

export type ReportListStatusLabelKey = keyof typeof REPORT_LIST_STATUS_LABEL;

export type ReportListStatusChip = {
  key: ReportListStatusLabelKey;
  label: (typeof REPORT_LIST_STATUS_LABEL)[ReportListStatusLabelKey];
  tone: "success" | "warning" | "neutral";
  cta: "Continue" | "View report";
};

function isReviewGate(currentGate: CurrentGate): boolean {
  return currentGate === CURRENT_GATE.GATE1 || currentGate === CURRENT_GATE.GATE3;
}

/** Coarse list chip from status (+ current_gate for review distinction). */
export function resolveReportListStatusChip(
  status: DonorReportStatus,
  currentGate: CurrentGate,
  options?: { exportDownloaded?: boolean },
): ReportListStatusChip {
  if (status === DONOR_REPORT_STATUS.EXTRACTING) {
    return {
      key: "READING_DOCUMENTS",
      label: REPORT_LIST_STATUS_LABEL.READING_DOCUMENTS,
      tone: "neutral",
      cta: "Continue",
    };
  }

  if (
    status === DONOR_REPORT_STATUS.AWAITING_REVIEW ||
    status === DONOR_REPORT_STATUS.DEGRADED ||
    isReviewGate(currentGate)
  ) {
    return {
      key: "NEEDS_YOUR_REVIEW",
      label: REPORT_LIST_STATUS_LABEL.NEEDS_YOUR_REVIEW,
      tone: "warning",
      cta: "Continue",
    };
  }

  if (status === DONOR_REPORT_STATUS.GENERATING || status === DONOR_REPORT_STATUS.DRAFT) {
    return {
      key: "DRAFT_READY",
      label: REPORT_LIST_STATUS_LABEL.DRAFT_READY,
      tone: "neutral",
      cta: "Continue",
    };
  }

  if (status === DONOR_REPORT_STATUS.COMPLETE) {
    if (options?.exportDownloaded) {
      return {
        key: "DOWNLOADED",
        label: REPORT_LIST_STATUS_LABEL.DOWNLOADED,
        tone: "success",
        cta: "View report",
      };
    }

    return {
      key: "READY_TO_DOWNLOAD",
      label: REPORT_LIST_STATUS_LABEL.READY_TO_DOWNLOAD,
      tone: "success",
      cta: "View report",
    };
  }

  return {
    key: "DRAFT_READY",
    label: REPORT_LIST_STATUS_LABEL.DRAFT_READY,
    tone: "neutral",
    cta: "Continue",
  };
}

/** Screen 5 progress headlines keyed off REPORT_JOB_STAGE groups. */
export const REPORT_JOB_PROGRESS_HEADLINE = {
  READING_DOCUMENTS: "Reading your documents",
  DRAFTING_REPORT: "Drafting your report",
  PREPARING_EXPORT: "Preparing your download",
} as const;

export const REPORT_READING_WORK_STEP_LABEL = {
  FILES_RECEIVED: "Files received",
  READING_DETAILS: "Reading project details",
  COMPARING_FIGURES: "Comparing figures across documents",
  PREPARING_REVIEW: "Preparing your review",
  DRAFTING_SECTIONS: "Drafting report sections",
  CHECKING_CLAIMS: "Checking claims against sources",
  FORMATTING_EXPORT: "Formatting your document",
} as const;

export type ReportReadingWorkStepState = "done" | "current" | "next";

export type ReportReadingWorkStep = {
  label: (typeof REPORT_READING_WORK_STEP_LABEL)[keyof typeof REPORT_READING_WORK_STEP_LABEL];
  state: ReportReadingWorkStepState;
};

export function resolveReportJobProgressHeadline(stage: ReportJobStage): string {
  if (stage === REPORT_JOB_STAGE.SYNTHESISE || stage === REPORT_JOB_STAGE.CRITIQUE) {
    return REPORT_JOB_PROGRESS_HEADLINE.DRAFTING_REPORT;
  }
  if (stage === REPORT_JOB_STAGE.EXPORT) {
    return REPORT_JOB_PROGRESS_HEADLINE.PREPARING_EXPORT;
  }
  return REPORT_JOB_PROGRESS_HEADLINE.READING_DOCUMENTS;
}

export function resolveReportReadingWorkSteps(stage: ReportJobStage): ReportReadingWorkStep[] {
  if (stage === REPORT_JOB_STAGE.SYNTHESISE || stage === REPORT_JOB_STAGE.CRITIQUE) {
    return [
      { label: REPORT_READING_WORK_STEP_LABEL.FILES_RECEIVED, state: "done" },
      { label: REPORT_READING_WORK_STEP_LABEL.READING_DETAILS, state: "done" },
      { label: REPORT_READING_WORK_STEP_LABEL.DRAFTING_SECTIONS, state: "current" },
      { label: REPORT_READING_WORK_STEP_LABEL.CHECKING_CLAIMS, state: "next" },
    ];
  }

  if (stage === REPORT_JOB_STAGE.EXPORT) {
    return [
      { label: REPORT_READING_WORK_STEP_LABEL.FILES_RECEIVED, state: "done" },
      { label: REPORT_READING_WORK_STEP_LABEL.DRAFTING_SECTIONS, state: "done" },
      { label: REPORT_READING_WORK_STEP_LABEL.CHECKING_CLAIMS, state: "done" },
      { label: REPORT_READING_WORK_STEP_LABEL.FORMATTING_EXPORT, state: "current" },
    ];
  }

  if (stage === REPORT_JOB_STAGE.RECONCILE || stage === REPORT_JOB_STAGE.GAP) {
    return [
      { label: REPORT_READING_WORK_STEP_LABEL.FILES_RECEIVED, state: "done" },
      { label: REPORT_READING_WORK_STEP_LABEL.READING_DETAILS, state: "done" },
      { label: REPORT_READING_WORK_STEP_LABEL.COMPARING_FIGURES, state: "current" },
      { label: REPORT_READING_WORK_STEP_LABEL.PREPARING_REVIEW, state: "next" },
    ];
  }

  return [
    { label: REPORT_READING_WORK_STEP_LABEL.FILES_RECEIVED, state: "done" },
    { label: REPORT_READING_WORK_STEP_LABEL.READING_DETAILS, state: "current" },
    { label: REPORT_READING_WORK_STEP_LABEL.COMPARING_FIGURES, state: "next" },
    { label: REPORT_READING_WORK_STEP_LABEL.PREPARING_REVIEW, state: "next" },
  ];
}

export const REPORT_DETAIL_ERROR_LABEL = {
  NOT_FOUND: "We could not find this report.",
  NOT_FOUND_BODY:
    "It may have been removed. Go back to your Reports page to start or open another one.",
  READING_FAILED: "We could not finish reading your documents.",
  READING_FAILED_BODY: "Please try again, or remove the problem file and read your documents again.",
} as const;

export const REPORT_DEGRADED_LABEL = {
  TITLE: "Completed with limitations",
  BODY: "Some sections could not be fully generated. You can still download what is available and review the summary below.",
} as const;

export const REPORT_GATE_PLACEHOLDER_LABEL = {
  TITLE: "This review step is being finalized",
  BODY: "Interactive review for this step ships in a later update. Your report progress is saved.",
} as const;
