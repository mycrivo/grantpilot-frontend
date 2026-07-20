/**
 * Shared Gate 1 conflict select-routing — consumed by server and degraded client panels.
 * Ambiguous/null/whitespace candidates never produce a save value.
 */

import { GATE1_LABEL } from "@/components/reports/report-status-labels";
import { isAmbiguousConflictValue } from "@/lib/knowledge-bank-view";

export type ConflictCandidateRoute =
  | { kind: "save"; value: unknown }
  | { kind: "explicit_entry" };

/** Concrete → save; ambiguous/null/whitespace → explicit entry (never empty PATCH). */
export function routeConflictCandidateSelection(value: unknown): ConflictCandidateRoute {
  if (isAmbiguousConflictValue(value)) {
    return { kind: "explicit_entry" };
  }
  return { kind: "save", value };
}

/** Degraded-card helper: same law, string payload for multi-key PATCH. */
export function routeClientConflictCandidateSelection(
  value: unknown,
): { kind: "explicit_entry" } | { kind: "save"; resolvedValue: string } {
  const route = routeConflictCandidateSelection(value);
  if (route.kind === "explicit_entry") {
    return { kind: "explicit_entry" };
  }
  return { kind: "save", resolvedValue: String(route.value) };
}

export function composeExplicitEntryContext(option?: {
  sourceLabel: string;
  provenanceExcerpt?: string | null;
}): string {
  if (option?.provenanceExcerpt) {
    return `From ${option.sourceLabel}: ${option.provenanceExcerpt}`;
  }
  if (option) {
    return `From ${option.sourceLabel}. ${GATE1_LABEL.CONFLICT_AMBIGUOUS_HINT}`;
  }
  return GATE1_LABEL.CONFLICT_ENTER_HELPER;
}

/** After explicit-entry save attempt: keep draft on failure (R5). */
export function nextExplicitEntryStateAfterSaveAttempt(args: {
  draft: string;
  saveSucceeded: boolean;
}): { showCustom: boolean; customValue: string; entryContextCleared: boolean } {
  if (!args.saveSucceeded) {
    return {
      showCustom: true,
      customValue: args.draft,
      entryContextCleared: false,
    };
  }
  return { showCustom: false, customValue: "", entryContextCleared: true };
}
