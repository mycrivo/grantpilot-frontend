/**
 * User-facing API error copy for M&E / report surfaces — keyed on error_code only.
 * error_code values are the stable contract; backend message strings are never shown.
 */

import type { ApiClientError } from "@/lib/api-client";
import { ME_UPGRADE_REQUIRED } from "@/lib/me-enums";

export const ME_GENERIC_ERROR_MESSAGE = "Something went wrong — please try again.";

export const ME_401_MESSAGE = "Your session has expired. Sign in again to continue.";
export const ME_5XX_SAVE_MESSAGE =
  "We're having trouble saving right now. Please try again shortly.";
export const ME_5XX_LOAD_MESSAGE =
  "We're having trouble loading this right now. Please try again shortly.";

export type ApiErrorSurface = "save" | "load";

export const ME_ERROR_MESSAGE: Record<string, string> = {
  // API_CONTRACT.md §12.14
  REPORT_NOT_FOUND: "We couldn't find this report. Return to your reports and open it again.",
  DONOR_REPORT_NOT_FOUND: "We couldn't find this report. Return to your reports and open it again.",
  TEMPLATE_NOT_FOUND: "We could not find that funder template.",
  JOB_NOT_FOUND: "We could not find progress for this report.",
  SECTION_NOT_FOUND: "We could not find that report section.",
  // Gate-agnostic — used on Gates 1/2/3 continue and edit paths
  GATE_NOT_SATISFIED:
    "This step isn't available right now. Refresh the page to see the latest version.",
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
  VALIDATION_ERROR: "Some information wasn't valid. Check the value and try again.",
  RATE_LIMITED: "You've hit a rate limit. Please wait a moment and try again.",
  ACTIVE_JOB_EXISTS: "This report is already being processed. Please wait for it to finish.",
  JOB_ALREADY_ACTIVE: "This report is already being processed. Please wait for it to finish.",
  REPORT_HAS_COMPLETED_RUN: "Documents cannot be removed after a report run has completed.",
  DOCUMENT_NOT_FOUND: "We could not find that document. Try refreshing the page.",

  // P1 door — server message is lane-specific contract copy; pass through in resolver.
  UNSUPPORTED_DOCUMENT_FORMAT: "__SERVER_MESSAGE__",

  // Gate 1 save path (D-062) — designed NGO copy; generic only for unknown codes
  KB_CONFLICT_RESOLUTION_VALUE_REQUIRED: "Enter a clear value before saving this item.",
  KB_PATCH_VALIDATION_FAILED:
    "We couldn't save this item because the project facts are out of sync. Refresh the page and try again. If it still won't save, contact support.",
  USE_GATE1_CONFIRM_ENDPOINT:
    "Review your facts, then use 'Continue to missing questions' to move on.",
  GATE1_VALIDATION_FAILED:
    "Resolve every item that needs your decision and review each section before continuing.",
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

/** Gate 1 facts-screen save path — same map; dedicated helper for call sites. */
export const GATE1_SAVE_ERROR_MESSAGE = ME_ERROR_MESSAGE;

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
  surface: ApiErrorSurface = "load",
): string {
  if (!error) {
    return fallback;
  }

  const code = resolveErrorCode(error);
  if (code === "UNSUPPORTED_DOCUMENT_FORMAT") {
    const serverMessage = typeof error.message === "string" ? error.message.trim() : "";
    if (serverMessage) {
      return serverMessage;
    }
  }
  if (code && ME_ERROR_MESSAGE[code]) {
    const mapped = ME_ERROR_MESSAGE[code];
    if (mapped !== "__SERVER_MESSAGE__") {
      return mapped;
    }
  }

  if (error.status === 401) {
    return ME_401_MESSAGE;
  }

  if (error.status === 429) {
    return ME_ERROR_MESSAGE.RATE_LIMITED;
  }

  if (typeof error.status === "number" && error.status >= 500) {
    return surface === "save" ? ME_5XX_SAVE_MESSAGE : ME_5XX_LOAD_MESSAGE;
  }

  return fallback;
}

/** Gate 1 save path: known codes mapped; generic only for unknown. */
export function resolveGate1SaveErrorMessage(
  error?: ApiErrorLike | ApiClientError | null,
): string {
  return resolveFriendlyApiErrorMessage(error, ME_GENERIC_ERROR_MESSAGE, "save");
}
