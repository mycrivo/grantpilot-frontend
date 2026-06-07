/**
 * Plain-language critic flag reasons for Gate 3 — severity is labelled separately.
 */

const KNOWN_CRITIC_REASON_LABEL: Record<string, string> = {
  NOT_SUPPORTED_BY_SOURCES: "This detail could not be verified against your uploaded documents.",
  SPECIFIC_NOT_SUPPORTED_BY_CITED_KNOWLEDGE_BANK_SOURCES:
    "This detail could not be verified against the facts you confirmed.",
  NOT_SUPPORTED_BY_CITED_SOURCES: "This detail could not be verified against your uploaded documents.",
};

function normalizeReasonKey(reason: string): string {
  return reason.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

function humanizeSnakeCase(value: string): string {
  const words = value.trim().toLowerCase().split("_").filter(Boolean);
  if (words.length === 0) {
    return "This detail could not be verified.";
  }
  const sentence = words.join(" ");
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

function looksLikeReasonCode(value: string): boolean {
  return /^[a-z0-9_]+$/.test(value) && value.includes("_");
}

/** User-facing explanation for a critic flag reason — never a bare internal code. */
export function formatCriticReason(reason: string | null | undefined): string {
  const trimmed = reason?.trim();
  if (!trimmed) {
    return "This detail could not be verified against your uploaded documents.";
  }

  const normalizedKey = normalizeReasonKey(trimmed);
  if (KNOWN_CRITIC_REASON_LABEL[normalizedKey]) {
    return KNOWN_CRITIC_REASON_LABEL[normalizedKey];
  }

  if (looksLikeReasonCode(trimmed)) {
    return humanizeSnakeCase(trimmed);
  }

  if (/^[A-Z0-9_]+$/.test(trimmed)) {
    return humanizeSnakeCase(trimmed.toLowerCase());
  }

  return trimmed;
}

export const CRITIC_REASON_PREFIX = "Why this was flagged: ";
