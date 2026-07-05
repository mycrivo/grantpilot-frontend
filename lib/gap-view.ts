/**
 * Normalizes §12.6 gap-check payloads for Gate 2 UI.
 */

import type { GapCheckMissingItem, GapCheckResponse, Gate2GapResponseInput } from "@/lib/api/reports";
import { humanizeSectionKey } from "@/lib/section-key-labels";

export type NormalizedGapQuestion = {
  itemKey: string;
  question: string;
  rationale: string;
  sectionLabel: string;
  sectionTag: string;
  severity: GapCheckMissingItem["severity"];
  requirementType: string | null;
  suggestedAction: "confirm_existing" | "provide" | "skip" | null;
  confirmExistingExcerpt: string | null;
};

export type GapQuestionGroup = {
  key: string;
  title: string;
  questions: NormalizedGapQuestion[];
};

export type GapQuestionDisposition = "unanswered" | "answered" | "skipped";

export type GapQuestionState = {
  disposition: GapQuestionDisposition;
  answerText: string;
  skipReason: "not_applicable" | "cannot_provide" | null;
};

const GROUP_TITLES: Record<string, string> = {
  data: "Data we need",
  confirm_existing: "Confirm what's on file",
  provide: "Data we need",
  skip: "Optional",
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
      typeof raw.section_label === "string" && raw.section_label.trim()
        ? raw.section_label
        : item.section_key
          ? humanizeSectionKey(item.section_key)
          : "General";
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
      sectionLabel,
      sectionTag: funderName.trim()
        ? `${funderName.trim()} · ${sectionLabel}`
        : sectionLabel,
      severity: item.severity,
      requirementType:
        typeof raw.requirement_type === "string" ? raw.requirement_type : null,
      suggestedAction:
        raw.suggested_action === "confirm_existing" ||
        raw.suggested_action === "provide" ||
        raw.suggested_action === "skip"
          ? raw.suggested_action
          : null,
      confirmExistingExcerpt:
        typeof raw.confirm_existing_excerpt === "string"
          ? raw.confirm_existing_excerpt
          : null,
    };
  });
}

export function groupGapQuestions(questions: NormalizedGapQuestion[]): GapQuestionGroup[] {
  const buckets = new Map<string, NormalizedGapQuestion[]>();

  for (const question of questions) {
    const groupKey =
      question.suggestedAction === "confirm_existing"
        ? "confirm_existing"
        : question.requirementType === "data" || question.suggestedAction === "provide"
          ? "data"
          : "other";
    const list = buckets.get(groupKey) ?? [];
    list.push(question);
    buckets.set(groupKey, list);
  }

  const order = ["confirm_existing", "data", "other"];
  return order
    .filter((key) => buckets.has(key))
    .map((key) => ({
      key,
      title: GROUP_TITLES[key] ?? "Other questions",
      questions: buckets.get(key) ?? [],
    }));
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

export function buildConfirmExistingPatch(itemKey: string) {
  return buildAnswerPatch(itemKey, "Yes, use the information on file.");
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
