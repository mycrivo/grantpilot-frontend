/**
 * User-facing API error copy for M&E / report surfaces — keyed on error_code only.
 * error_code values are the stable contract; backend message strings are never shown.
 */

import type { ApiClientError } from "@/lib/api-client";
import { ME_UPGRADE_REQUIRED } from "@/lib/me-enums";

export const ME_GENERIC_ERROR_MESSAGE = "Something went wrong — please try again.";

export const ME_ERROR_MESSAGE: Record<string, string> = {
  // API_CONTRACT.md §12.14
  REPORT_NOT_FOUND: "We could not find this report.",
  DONOR_REPORT_NOT_FOUND: "We could not find this report.",
  TEMPLATE_NOT_FOUND: "We could not find that funder template.",
  JOB_NOT_FOUND: "We could not find progress for this report.",
  SECTION_NOT_FOUND: "We could not find that report section.",
  GATE_NOT_SATISFIED: "Please complete the previous review step before continuing.",
  EXPORT_NOT_READY: "Your report is not ready to download yet. Finish review first.",
  EXPORT_NOT_FOUND: "Your report is not ready to download yet. Finish review first.",
  FILE_TOO_LARGE: "That file is too large. Try a smaller file or compress it first.",
  UNSUPPORTED_MEDIA_TYPE: "That file type is not supported. Try PDF, Word, Excel, or an image.",
  UNSUPPORTED_FORMAT: "That export format is not supported.",
  [ME_UPGRADE_REQUIRED.ERROR_CODE]:
    "M&E reporting is available on the Impact plan.",

  // Shared platform codes surfaced on report routes
  QUOTA_EXCEEDED: "You have used all M&E reports for this billing period.",
  PROFILE_INCOMPLETE: "Complete your organisation profile before starting a report.",
  VALIDATION_ERROR: "Some of the information provided was not valid. Please check and try again.",
  RATE_LIMITED: "You've hit a rate limit. Please wait a moment and try again.",
  ACTIVE_JOB_EXISTS: "This report is already being processed. Please wait for it to finish.",
  JOB_ALREADY_ACTIVE: "This report is already being processed. Please wait for it to finish.",
  REPORT_HAS_COMPLETED_RUN: "Documents cannot be removed after a report run has completed.",
  DOCUMENT_NOT_FOUND: "We could not find that document. Try refreshing the page.",

  // Gate 1
  GATE1_VALIDATION_FAILED:
    "Some project facts could not be saved. Please review the highlighted items and try again.",
  GATE1_NOT_CONFIRMED: "Please confirm your project facts before continuing.",

  // Gate 2
  GATE2_NOT_CONFIRMED: "Please answer the missing questions before continuing.",
  GATE2_UNKNOWN_GAP_KEYS: "Some answers could not be matched. Please refresh and try again.",
  GAP_ANALYSIS_MISSING: "Gap review is not ready yet. Please wait and try again.",
  GAP_ANALYSIS_INVALID: "Gap review data looks incomplete. Please refresh and try again.",

  // Gate 3 / critic
  GATE3_NOT_CONFIRMED: "Please finish reviewing your draft before downloading.",
  GATE3_NO_CONTENT: "Your draft report is not ready yet.",
  GATE3_CRITIQUE_INCOMPLETE: "The fact-safety check has not finished yet. Please wait and try again.",
  GATE3_UNACCEPTED_BLOCKS:
    "Please review and resolve all flagged issues before downloading.",
  GATE3_SECTIONS_NOT_ACCEPTED: "Please review all sections before downloading.",

  FUNDER_TEMPLATE_NOT_FOUND: "We could not load the funder template for this report.",
};

type ApiErrorLike = {
  status?: number;
  errorCode?: string;
  error_code?: string;
  message?: string;
  details?: unknown;
};

function resolveErrorCode(error?: ApiErrorLike | null): string | undefined {
  return error?.errorCode ?? error?.error_code;
}

/** Friendly copy for API errors on M&E/report surfaces — never returns raw backend message. */
export function resolveFriendlyApiErrorMessage(
  error?: ApiErrorLike | ApiClientError | null,
  fallback: string = ME_GENERIC_ERROR_MESSAGE,
): string {
  if (!error) {
    return fallback;
  }

  const code = resolveErrorCode(error);
  if (code && ME_ERROR_MESSAGE[code]) {
    return ME_ERROR_MESSAGE[code];
  }

  if (error.status === 429) {
    return ME_ERROR_MESSAGE.RATE_LIMITED;
  }

  if (typeof error.status === "number" && error.status >= 500) {
    return "We're experiencing a temporary issue. Please try again shortly.";
  }

  return fallback;
}
