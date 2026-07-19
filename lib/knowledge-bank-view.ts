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
  verificationStatus: string | null;
  needsPromotion: boolean;
};

export type NormalizedConflictValue = {
  value: unknown;
  unit: string | null;
  displayText: string;
  sourceLabel: string;
  provenanceExcerpt: string | null;
  requiresExplicitEntry: boolean;
};

export type NormalizedConflict = {
  factKey: string;
  conflictType: string | null;
  /** Deterministic NGO-safe explanation — never raw agent annotation. */
  explanation: string;
  values: NormalizedConflictValue[];
  resolvedValue: unknown | null;
  isResolved: boolean;
  /** Human-readable label for the disputed fact (from facts map when present). */
  factLabel: string;
};

export function formatFactValue(value: unknown, unit?: string | null): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  const base = String(value);
  return unit ? `${base} ${unit}` : base;
}

export function isAmbiguousConflictValue(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === "string" && !value.trim());
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as Record<string, unknown>;
}

function humanizeFactKey(factKey: string): string {
  const parts = factKey.split(".").filter(Boolean);
  if (!parts.length) {
    return "this item";
  }
  return parts
    .map((part) => part.replace(/_/g, " "))
    .map((part) => (part.length ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" — ");
}

/** Compose a self-explanatory conflict story without internal identifiers (Amendment 3). */
export function composeConflictExplanation(
  conflict: Record<string, unknown>,
  factLabel: string,
  values: NormalizedConflictValue[],
): string {
  const sources = Array.from(
    new Set(values.map((v) => v.sourceLabel.trim()).filter(Boolean)),
  );
  const sourcePhrase =
    sources.length === 0
      ? "your documents"
      : sources.length === 1
        ? sources[0]
        : `${sources.slice(0, -1).join(", ")} and ${sources[sources.length - 1]}`;

  const hasAmbiguous = values.some((v) => v.requiresExplicitEntry);
  const base = `We found more than one value for ${factLabel} in ${sourcePhrase}.`;
  if (hasAmbiguous) {
    return `${base} One source mentions a value that isn't specific enough to use — choose a clear value or enter the correct one.`;
  }
  return `${base} Choose which value this report should use.`;
}

export function normalizeConflicts(
  conflicts: unknown[],
  facts: Record<string, unknown> = {},
): NormalizedConflict[] {
  return conflicts.map((raw) => {
    const conflict = asRecord(raw) ?? {};
    const valuesRaw = Array.isArray(conflict.values) ? conflict.values : [];
    const factKey = String(conflict.fact_key ?? "");
    const factRec = asRecord(facts[factKey]);
    const factLabel =
      (factRec && typeof factRec.semantic_label === "string" && factRec.semantic_label.trim())
        ? factRec.semantic_label.trim()
        : humanizeFactKey(factKey);

    const values: NormalizedConflictValue[] = valuesRaw.map((entry) => {
      const valueRow = asRecord(entry) ?? {};
      const unit = typeof valueRow.unit === "string" ? valueRow.unit : null;
      const value = valueRow.value;
      const requiresExplicitEntry = isAmbiguousConflictValue(value);
      const provenance = asRecord(valueRow.provenance);
      const provenanceExcerpt =
        provenance && typeof provenance.excerpt === "string" ? provenance.excerpt : null;
      return {
        value,
        unit,
        displayText: requiresExplicitEntry
          ? "This source does not give a clear value"
          : formatFactValue(value, unit),
        sourceLabel: String(valueRow.source_label ?? "Unknown source"),
        provenanceExcerpt,
        requiresExplicitEntry,
      };
    });

    return {
      factKey,
      conflictType: typeof conflict.conflict_type === "string" ? conflict.conflict_type : null,
      explanation: composeConflictExplanation(conflict, factLabel, values),
      resolvedValue: conflict.resolved_value ?? null,
      isResolved:
        conflict.resolved_value !== null &&
        conflict.resolved_value !== undefined &&
        !(typeof conflict.resolved_value === "string" && !String(conflict.resolved_value).trim()),
      values,
      factLabel,
    };
  });
}

export function normalizeFacts(
  facts: Record<string, unknown>,
  unresolvedConflictKeys: Set<string>,
): NormalizedFact[] {
  return Object.entries(facts)
    .filter(([key, raw]) => {
      if (unresolvedConflictKeys.has(key)) {
        return false;
      }
      const fact = asRecord(raw);
      // D-060: hide provenance-only siblings from ordinary review rows.
      if (fact && typeof fact.provenance_only_for === "string" && fact.provenance_only_for.trim()) {
        return false;
      }
      return true;
    })
    .map(([key, raw]) => {
      const fact = asRecord(raw) ?? {};
      const label = String(fact.semantic_label ?? key);
      const unit = typeof fact.unit === "string" ? fact.unit : null;
      const value = fact.value;
      const verificationStatus =
        typeof fact.verification_status === "string" ? fact.verification_status : null;
      const needsPromotion = verificationStatus === "unverified";

      return {
        key,
        label,
        value,
        unit,
        displayText: `${label}: ${formatFactValue(value, unit)}`,
        sourceLabel: String(fact.source_label ?? "Unknown source"),
        confirmed: Boolean(fact.confirmed),
        verificationStatus,
        needsPromotion,
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
  const conflicts = normalizeConflicts(knowledgeBank.conflicts, knowledgeBank.facts);
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
