/**
 * Normalizes §12.6 gap-check payloads for Gate 2 UI.
 */

import type { GapCheckMissingItem, GapCheckResponse, Gate2GapResponseInput } from "@/lib/api/reports";

export type NormalizedGapQuestion = {
  itemKey: string;
  question: string;
  rationale: string;
  sectionTag: string;
  severity: GapCheckMissingItem["severity"];
};

export type GapQuestionDisposition = "unanswered" | "answered" | "skipped";

export type GapQuestionState = {
  disposition: GapQuestionDisposition;
  answerText: string;
  skipReason: "not_applicable" | "cannot_provide" | null;
};

export function shouldRenderGate2(gapCheck: GapCheckResponse): boolean {
  return gapCheck.ready_for_gate2 && !gapCheck.gate2_confirmed_at;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as Record<string, unknown>;
}

export function normalizeGapQuestions(
  gapCheck: GapCheckResponse,
  funderName: string,
): NormalizedGapQuestion[] {
  return gapCheck.missing_items.map((item) => {
    const raw = asRecord(item) ?? {};
    const sectionLabel =
      typeof raw.section_label === "string"
        ? raw.section_label
        : item.section_key ?? "General";
    const rationale =
      typeof raw.rationale === "string"
        ? raw.rationale
        : typeof raw.question === "string"
          ? item.label
          : item.label;
    const question =
      typeof raw.question === "string" ? raw.question : item.prompt || item.label;

    return {
      itemKey: item.item_key,
      question,
      rationale,
      sectionTag: `${funderName}${sectionLabel ? ` · ${sectionLabel}` : ""}`,
      severity: item.severity,
    };
  });
}

export function buildAnswerPatch(itemKey: string, answerText: string) {
  return {
    gap_answers: {
      [itemKey]: {
        disposition: "answered" as const,
        answer_text: answerText,
        skip_reason: null,
      },
    },
  };
}

export function buildSkipPatch(itemKey: string, skipReason: "not_applicable" | "cannot_provide" = "cannot_provide") {
  return {
    gap_answers: {
      [itemKey]: {
        disposition: "skipped" as const,
        answer_text: null,
        skip_reason: skipReason,
      },
    },
  };
}

export function buildSubmitResponses(
  questions: NormalizedGapQuestion[],
  states: Record<string, GapQuestionState>,
): Record<string, Gate2GapResponseInput> {
  const responses: Record<string, Gate2GapResponseInput> = {};

  for (const question of questions) {
    const state = states[question.itemKey];

    if (state?.disposition === "answered" && state.answerText.trim()) {
      responses[question.itemKey] = {
        disposition: "answered",
        answer_text: state.answerText.trim(),
      };
      continue;
    }

    if (state?.disposition === "skipped") {
      responses[question.itemKey] = {
        disposition: "skipped",
        skip_reason: state.skipReason ?? "cannot_provide",
      };
      continue;
    }

    responses[question.itemKey] = {
      disposition: "skipped",
      skip_reason: "cannot_provide",
    };
  }

  return responses;
}
