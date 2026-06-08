/**
 * Plain-language M&E status labels — ME_MODULE_REPORTS_NGO_UI.html header map + Screens 5/9.
 * Keys off lib/me-enums.ts values only; no ad-hoc status string literals elsewhere.
 */

import {
  CURRENT_GATE,
  DONOR_REPORT_STATUS,
  REPORT_JOB_STAGE,
  REPORT_JOB_STATUS,
  type CurrentGate,
  type DonorReportStatus,
  type ReportJobStage,
  type ReportJobStatus,
} from "@/lib/me-enums";

export const REPORT_LIST_STATUS_LABEL = {
  READING_DOCUMENTS: "Reading documents",
  NEEDS_YOUR_REVIEW: "Needs your review",
  DRAFT_READY: "Draft ready",
  GENERATION_FAILED: "Generation failed",
  COMPLETED_WITH_LIMITATIONS: "Completed with limitations",
  READY_TO_DOWNLOAD: "Ready to download",
  DOWNLOADED: "Downloaded",
} as const;

export type ReportListStatusLabelKey = keyof typeof REPORT_LIST_STATUS_LABEL;

export type ReportListStatusChip = {
  key: ReportListStatusLabelKey;
  label: (typeof REPORT_LIST_STATUS_LABEL)[ReportListStatusLabelKey];
  tone: "success" | "warning" | "error" | "neutral";
  cta: "Continue" | "View report" | "Start over" | "View details";
};

function isActiveJobStatus(status: ReportJobStatus | null | undefined): boolean {
  return (
    status === REPORT_JOB_STATUS.QUEUED ||
    status === REPORT_JOB_STATUS.RUNNING
  );
}

function isReviewGate(currentGate: CurrentGate): boolean {
  return currentGate === CURRENT_GATE.GATE1 || currentGate === CURRENT_GATE.GATE3;
}

/** Coarse list chip from status (+ current_gate for review distinction). */
export function resolveReportListStatusChip(
  status: DonorReportStatus,
  currentGate: CurrentGate,
  options?: {
    exportDownloaded?: boolean;
    latestJobStatus?: ReportJobStatus | null;
    latestJobStage?: ReportJobStage | null;
  },
): ReportListStatusChip {
  if (options?.latestJobStatus === REPORT_JOB_STATUS.FAILED) {
    return {
      key: "GENERATION_FAILED",
      label: REPORT_LIST_STATUS_LABEL.GENERATION_FAILED,
      tone: "error",
      cta: "View details",
    };
  }

  if (isActiveJobStatus(options?.latestJobStatus)) {
    return {
      key: "READING_DOCUMENTS",
      label: REPORT_LIST_STATUS_LABEL.READING_DOCUMENTS,
      tone: "neutral",
      cta: "Continue",
    };
  }

  if (status === DONOR_REPORT_STATUS.EXTRACTING) {
    return {
      key: "READING_DOCUMENTS",
      label: REPORT_LIST_STATUS_LABEL.READING_DOCUMENTS,
      tone: "neutral",
      cta: "Continue",
    };
  }

  if (status === DONOR_REPORT_STATUS.DEGRADED) {
    return {
      key: "COMPLETED_WITH_LIMITATIONS",
      label: REPORT_LIST_STATUS_LABEL.COMPLETED_WITH_LIMITATIONS,
      tone: "warning",
      cta: "View report",
    };
  }

  if (status === DONOR_REPORT_STATUS.AWAITING_REVIEW || isReviewGate(currentGate)) {
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

export const REPORT_READING_FAILED_LABEL = {
  START_OVER: "Start over",
  BACK_TO_REPORTS: "Back to M&E Reports",
} as const;

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
    "It may have been removed. Go back to your M&E Reports page to start or open another one.",
  READING_FAILED: "We could not finish reading your documents.",
  READING_FAILED_BODY: "Please try again, or remove the problem file and read your documents again.",
  DRAFTING_FAILED: "We could not finish drafting your report.",
  DRAFTING_FAILED_BODY:
    "Please try again. If the problem continues, go back and check the facts and answers you confirmed.",
  EXPORT_FAILED: "We could not prepare your download.",
  EXPORT_FAILED_BODY: "Please try again. Your draft sections are saved — you can return to review and retry.",
  GAP_FAILED: "We could not finish checking your report against the funder template.",
  GAP_FAILED_BODY:
    "This happened after your facts were confirmed. Please try again — your confirmed facts are saved. If it keeps failing, contact support.",
} as const;

export type JobFailureCopy = {
  headline: string;
  body: string;
};

/** Stage-specific failure headlines — never surface raw job.error. */
export function resolveJobFailureCopy(stage: ReportJobStage): JobFailureCopy {
  if (stage === REPORT_JOB_STAGE.SYNTHESISE || stage === REPORT_JOB_STAGE.CRITIQUE) {
    return {
      headline: REPORT_DETAIL_ERROR_LABEL.DRAFTING_FAILED,
      body: REPORT_DETAIL_ERROR_LABEL.DRAFTING_FAILED_BODY,
    };
  }
  if (stage === REPORT_JOB_STAGE.EXPORT) {
    return {
      headline: REPORT_DETAIL_ERROR_LABEL.EXPORT_FAILED,
      body: REPORT_DETAIL_ERROR_LABEL.EXPORT_FAILED_BODY,
    };
  }
  if (stage === REPORT_JOB_STAGE.GAP) {
    return {
      headline: REPORT_DETAIL_ERROR_LABEL.GAP_FAILED,
      body: REPORT_DETAIL_ERROR_LABEL.GAP_FAILED_BODY,
    };
  }
  if (
    stage === REPORT_JOB_STAGE.RECONCILE ||
    stage === REPORT_JOB_STAGE.EXTRACT ||
    stage === REPORT_JOB_STAGE.CLASSIFY
  ) {
    return {
      headline: REPORT_DETAIL_ERROR_LABEL.READING_FAILED,
      body: REPORT_DETAIL_ERROR_LABEL.READING_FAILED_BODY,
    };
  }
  return {
    headline: REPORT_DETAIL_ERROR_LABEL.READING_FAILED,
    body: REPORT_DETAIL_ERROR_LABEL.READING_FAILED_BODY,
  };
}

/** Reading step — resolved but no active job to poll (e.g. awaiting pipeline resume). */
export const REPORT_READING_HOLDING_LABEL = {
  TITLE: "Your report is being prepared",
  BODY: "This can take a little while. You can leave and come back — we will email you when your review is ready.",
  BACK_TO_REPORTS: "Return to M&E Reports",
} as const;

export const REPORT_DEGRADED_LABEL = {
  TITLE: "Completed with limitations",
  BODY: "Some sections could not be fully generated. You can still download what is available and review the summary below.",
  DONE_HEADLINE: "Your report is available",
  DONE_SUBHEAD:
    "Download the formatted Word document. Some sections may show as not provided where source data was missing.",
} as const;

export const REPORT_GATE_PLACEHOLDER_LABEL = {
  TITLE: "This review step is being finalized",
  BODY: "Interactive review for this step ships in a later update. Your report progress is saved.",
} as const;

/** Screen 6 — Gate 1 review facts (ME_MODULE_REPORTS_NGO_UI.html). */
export const GATE1_LABEL = {
  TITLE: "Review the project facts",
  SUBTITLE: "These are the details we found. Confirm or correct them before the report is drafted.",
  CONFIRMED_FACTS: "Confirmed facts",
  CONFLICT_HEADING: "Two sources show different figures",
  CONFLICT_SUBHEADING: "Which figure should the report use?",
  CONFLICT_ENTER_OTHER: "Enter another figure",
  CONFLICT_ENTER_OTHER_PROMPT: "Enter your value",
  TRUST_LINE: "GrantPilot does not choose between conflicting figures. You decide what is correct.",
  CONFIRM_FACTS: "Confirm facts",
  ADD_FACT: "+ Add a fact",
  FACT_CONFIRMED: "Confirmed",
  FACT_EDIT: "Edit",
  FACT_SAVE: "Save",
  FACT_CANCEL: "Cancel",
  SOURCE_PREFIX: "From:",
  ADD_FACT_TITLE: "Add a fact",
  ADD_FACT_LABEL: "Fact description",
  ADD_FACT_VALUE: "Value",
  ADD_FACT_SOURCE: "Source (optional)",
  ADD_FACT_SAVE: "Add fact",
  USER_SOURCE_LABEL: "Added by you",
  CONFIRMING: "Confirming…",
  SAVING: "Saving…",
  UNREADABLE_HEADING: "We could not read some files",
  UNREADABLE_SUBHEADING:
    "These documents could not be extracted. Missing details will appear as not provided in your report — GrantPilot will not invent figures from them.",
  UNREADABLE_TRUST_LINE: "You can still confirm the facts we found from your other documents.",
  DEGRADED_HEADING: "Documents not fully merged",
  DEGRADED_BODY:
    "We extracted your documents but could not fully merge them. Review duplicates carefully before confirming.",
  NEEDS_DECISION: "Needs your decision",
  NEEDS_DECISION_COUNT: (count: number) =>
    count === 1 ? "1 item needs your decision" : `${count} items need your decision`,
  SECTION_PROGRAMME: "Programme summary",
  SECTION_INDICATORS: "Indicators",
  SECTION_FINANCIALS: "Financials by output",
  SECTION_OBJECTIVES: "Objectives and activities",
  SECTION_REPORTING: "Reporting obligations",
  SECTION_OTHER: "Other details",
  ALSO_FOUND_IN: "Also found in:",
  ROWS: (count: number) => (count === 1 ? "1 item" : `${count} items`),
  SEARCH_PLACEHOLDER: "Search facts…",
  STICKY_CONFIRM_HINT: "Resolve all conflicts before confirming.",
} as const;

/** Screen 7 — Gate 2 missing questions (ME_MODULE_REPORTS_NGO_UI.html). */
export const GATE2_LABEL = {
  TITLE: "Answer a few missing questions",
  SUBTITLE:
    "We could not find these details in your documents. Answer what you can. Skip anything you cannot confirm.",
  SAVE_ANSWER: "Save answer",
  SKIP: "Skip",
  SKIPPED: "Skipped — not provided",
  SAVED: "Answer saved",
  CONTINUE_TO_DRAFT: "Continue to draft",
  CONTINUING: "Continuing…",
  SAVING: "Saving…",
  TRUST_LINE: "Skipped answers are marked as not provided. GrantPilot will not invent missing information.",
  ANSWER_PLACEHOLDER: "Type your answer…",
  WHY_PREFIX: "",
  SECTION_SEPARATOR: " · ",
} as const;

/** Screen 8 — Gate 3 draft review (ME_MODULE_REPORTS_NGO_UI.html). */
export const GATE3_SECTION_STATUS_LABEL = {
  CHECKED: "Checked",
  EDITED: "Edited",
  NEEDS_REVIEW: "Needs review",
  NOT_PROVIDED: "Not provided",
} as const;

export const GATE3_CRITIC_SEVERITY_LABEL = {
  BLOCK: "Must fix before download",
  WARN: "Please review",
} as const;

export const GATE3_LABEL = {
  TITLE: "Review your draft report",
  SUBTITLE: "The draft follows the funder\u2019s structure and uses the facts you confirmed.",
  SOURCE_CHECK_TITLE: "Source check needed",
  SOURCE_CHECK_MULTIPLE: "Several sections need your review before download.",
  SECTIONS_EYEBROW: "Report sections",
  TRUST_LINE: "You stay the author. Review, edit, and approve the report before downloading.",
  DOWNLOAD_DOCX: "Download DOCX",
  APPROVING: "Approving\u2026",
  SAVE_SECTION: "Save section",
  EDIT_SECTION: "Edit section",
  ADD_CONTENT: "Add content",
  CANCEL: "Cancel",
  SAVING: "Saving\u2026",
  EDIT_SECTION_LABEL: "Edit section text",
  NOT_PROVIDED_PREVIEW:
    "No content provided for this section. It will appear in the report as \u201cnot provided\u201d.",
  BACK_TO_QUESTIONS: "Back to questions",
  REVIEW_ISSUE: "Review issue",
  REVIEW_BEFORE_DOWNLOAD: "Please review before download.",
} as const;

/** Dashboard + Path C entry (B-04 cohesion). */
export const DASHBOARD_REPORTS_LABEL = {
  TITLE: "M&E Reports",
  VIEW_ALL: "View all reports",
  PATH_C_LINK: "Won a grant elsewhere?",
  EMPTY: "No M&E reports yet.",
  START_CTA: "Start a report",
} as const;

export const PATH_C_LABEL = {
  TITLE: "Report on a grant you\u2019ve won",
  SUBTITLE:
    "Whether you won with GrantPilot or elsewhere, turn your project documents into a structured funder report.",
  BODY:
    "You do not need a prior fit scan or proposal. Upload what you have, confirm the facts, and GrantPilot drafts the report in your funder\u2019s format.",
  CTA: "Start your report",
  VIEW_REPORTS: "View your reports",
} as const;
