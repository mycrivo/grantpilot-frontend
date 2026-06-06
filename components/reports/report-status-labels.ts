/**
 * Screen 0 plain-language status chips — ME_MODULE_REPORTS_NGO_UI.html header map.
 * Keys off lib/me-enums.ts values only; no ad-hoc status string literals elsewhere.
 */

import {
  CURRENT_GATE,
  DONOR_REPORT_STATUS,
  type CurrentGate,
  type DonorReportStatus,
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
