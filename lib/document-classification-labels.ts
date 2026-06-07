/**
 * Friendly labels for uploaded document classification — ENUM_REGISTRY.md §5.3.
 */

import { DOCUMENT_CLASSIFICATION, type DocumentClassification } from "@/lib/me-enums";

export const DOCUMENT_CLASSIFICATION_LABEL: Record<DocumentClassification, string> = {
  [DOCUMENT_CLASSIFICATION.PROPOSAL]: "Proposal",
  [DOCUMENT_CLASSIFICATION.GRANT_LETTER]: "Grant award letter",
  [DOCUMENT_CLASSIFICATION.MOU]: "Memorandum of understanding",
  [DOCUMENT_CLASSIFICATION.INDICATOR_DATA]: "Results spreadsheet",
  [DOCUMENT_CLASSIFICATION.PHOTO]: "Photo",
  [DOCUMENT_CLASSIFICATION.DECK]: "Slide deck",
  [DOCUMENT_CLASSIFICATION.OTHER]: "Other document",
};

export const DOCUMENT_CLASSIFICATION_PENDING_LABEL = "Checking document…";

function humanizeClassificationFallback(value: string): string {
  return value
    .trim()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function documentClassificationLabel(classification: string | null | undefined): string {
  if (!classification?.trim()) {
    return DOCUMENT_CLASSIFICATION_PENDING_LABEL;
  }

  const normalized = classification.trim().toLowerCase() as DocumentClassification;
  if (normalized in DOCUMENT_CLASSIFICATION_LABEL) {
    return DOCUMENT_CLASSIFICATION_LABEL[normalized];
  }

  return humanizeClassificationFallback(classification);
}
