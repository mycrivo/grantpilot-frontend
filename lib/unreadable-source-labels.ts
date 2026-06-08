/**
 * Friendly labels for unreadable / degraded extraction codes (Gate 1, P2 Option B).
 */

const UNREADABLE_CODE_LABEL: Record<string, string> = {
  DEGRADED_EXTRACTION_UNPARSEABLE: "We could not read this file",
  DEGRADED_EXTRACTION_TIMEOUT: "Reading this file took too long",
  UNREADABLE_DOCUMENT_LOW_CONTENT: "This file had too little text to extract",
  DEGRADED_EXTRACTION: "We could not extract data from this file",
};

export function formatUnreadableSourceExplanation(code: string, message: string): string {
  const label = UNREADABLE_CODE_LABEL[code];
  if (label) {
    return label;
  }
  if (message.trim()) {
    return message.trim();
  }
  return "We could not read this file";
}
