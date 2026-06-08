/**
 * Normalizes §12.4 knowledge-bank payloads for Gate 1 UI (DB_FIELD_CONTRACT §2.6).
 */

import type { KnowledgeBankResponse, UnreadableSource } from "@/lib/api/reports";
import { formatUnreadableSourceExplanation } from "@/lib/unreadable-source-labels";

export type NormalizedFact = {
  key: string;
  label: string;
  value: unknown;
  unit: string | null;
  displayText: string;
  sourceLabel: string;
  confirmed: boolean;
};

export type NormalizedConflictValue = {
  value: unknown;
  unit: string | null;
  displayText: string;
  sourceLabel: string;
};

export type NormalizedConflict = {
  factKey: string;
  conflictType: string | null;
  annotation: string | null;
  values: NormalizedConflictValue[];
  resolvedValue: unknown | null;
  isResolved: boolean;
};

export function formatFactValue(value: unknown, unit?: string | null): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  const base = String(value);
  return unit ? `${base} ${unit}` : base;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as Record<string, unknown>;
}

export function normalizeConflicts(conflicts: unknown[]): NormalizedConflict[] {
  return conflicts.map((raw) => {
    const conflict = asRecord(raw) ?? {};
    const values = Array.isArray(conflict.values) ? conflict.values : [];

    return {
      factKey: String(conflict.fact_key ?? ""),
      conflictType: typeof conflict.conflict_type === "string" ? conflict.conflict_type : null,
      annotation: typeof conflict.annotation === "string" ? conflict.annotation : null,
      resolvedValue: conflict.resolved_value ?? null,
      isResolved: conflict.resolved_value !== null && conflict.resolved_value !== undefined,
      values: values.map((entry) => {
        const valueRow = asRecord(entry) ?? {};
        const unit = typeof valueRow.unit === "string" ? valueRow.unit : null;
        return {
          value: valueRow.value,
          unit,
          displayText: formatFactValue(valueRow.value, unit),
          sourceLabel: String(valueRow.source_label ?? "Unknown source"),
        };
      }),
    };
  });
}

export function normalizeFacts(
  facts: Record<string, unknown>,
  unresolvedConflictKeys: Set<string>,
): NormalizedFact[] {
  return Object.entries(facts)
    .filter(([key]) => !unresolvedConflictKeys.has(key))
    .map(([key, raw]) => {
      const fact = asRecord(raw) ?? {};
      const label = String(fact.semantic_label ?? key);
      const unit = typeof fact.unit === "string" ? fact.unit : null;
      const value = fact.value;

      return {
        key,
        label,
        value,
        unit,
        displayText: `${label}: ${formatFactValue(value, unit)}`,
        sourceLabel: String(fact.source_label ?? "Unknown source"),
        confirmed: Boolean(fact.confirmed),
      };
    });
}

export type NormalizedUnreadableSource = {
  sourceDocumentId: string;
  sourceLabel: string;
  explanation: string;
};

export function normalizeUnreadableSources(sources: UnreadableSource[] | undefined): NormalizedUnreadableSource[] {
  if (!sources?.length) {
    return [];
  }

  return sources.map((source) => ({
    sourceDocumentId: source.source_document_id,
    sourceLabel: source.source_label,
    explanation: formatUnreadableSourceExplanation(source.code, source.message),
  }));
}

export function buildKnowledgeBankView(knowledgeBank: KnowledgeBankResponse): {
  facts: NormalizedFact[];
  conflicts: NormalizedConflict[];
  unresolvedConflicts: NormalizedConflict[];
  unreadableSources: NormalizedUnreadableSource[];
} {
  const conflicts = normalizeConflicts(knowledgeBank.conflicts);
  const unresolvedConflictKeys = new Set(
    conflicts.filter((conflict) => !conflict.isResolved).map((conflict) => conflict.factKey),
  );
  const facts = normalizeFacts(knowledgeBank.facts, unresolvedConflictKeys);

  return {
    facts,
    conflicts,
    unresolvedConflicts: conflicts.filter((conflict) => !conflict.isResolved),
    unreadableSources: normalizeUnreadableSources(knowledgeBank.unreadable_sources),
  };
}

export function shouldRenderGate1(knowledgeBank: KnowledgeBankResponse): boolean {
  return knowledgeBank.ready_for_gate1 && !knowledgeBank.gate1_confirmed_at;
}

export { buildGate1LayoutView, type Gate1LayoutView } from "@/lib/knowledge-bank-gate1-layout";

export function buildUserAddedFactPayload(label: string, value: string, sourceLabel: string) {
  return {
    value,
    unit: null,
    semantic_label: label,
    coverage: "single_source",
    source_document_id: "user-provided",
    source_label: sourceLabel,
    provenance: { excerpt: "User-provided fact" },
    interpretation_note: null,
    confirmed: true,
    confirmed_by_user: true,
  };
}
