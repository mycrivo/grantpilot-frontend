/**
 * Gate 1 layout: section grouping, degraded dedup, table view-models, client-promoted conflicts.
 */

import type { KnowledgeBankResponse } from "@/lib/api/reports";
import {
  formatFactValue,
  normalizeConflicts,
  normalizeFacts,
  normalizeUnreadableSources,
  type NormalizedConflict,
  type NormalizedFact,
  type NormalizedUnreadableSource,
} from "@/lib/knowledge-bank-view";

export type Gate1SectionId =
  | "programme_summary"
  | "indicators"
  | "financials"
  | "objectives"
  | "reporting"
  | "other";

export type DisplayFact = NormalizedFact & {
  alternateSourceLabels: string[];
  collapsedFactKeys: string[];
};

export type ClientPromotedConflictValue = {
  factKey: string;
  value: unknown;
  unit: string | null;
  displayText: string;
  sourceLabel: string;
};

export type ClientPromotedConflict = {
  id: string;
  label: string;
  values: ClientPromotedConflictValue[];
  isResolved: boolean;
  resolvedValue: unknown | null;
};

export type IndicatorTableRow = {
  rowId: string;
  label: string;
  y1Target: DisplayFact | null;
  y1Actual: DisplayFact | null;
  endlineTarget: DisplayFact | null;
  unit: string | null;
};

export type FinancialTableRow = {
  rowId: string;
  label: string;
  budget: DisplayFact | null;
  actual: DisplayFact | null;
  currency: string | null;
};

export type Gate1Sections = {
  programmeSummary: DisplayFact[];
  indicators: DisplayFact[];
  indicatorTable: IndicatorTableRow[];
  financials: DisplayFact[];
  financialTable: FinancialTableRow[];
  objectives: DisplayFact[];
  reporting: DisplayFact[];
  other: DisplayFact[];
};

export type Gate1LayoutView = {
  isDegraded: boolean;
  rawFactCount: number;
  displayFactCount: number;
  conflicts: NormalizedConflict[];
  unresolvedConflicts: NormalizedConflict[];
  clientPromotedConflicts: ClientPromotedConflict[];
  unresolvedClientConflicts: ClientPromotedConflict[];
  sections: Gate1Sections;
  unreadableSources: NormalizedUnreadableSource[];
};

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

function valuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function toDisplayFact(fact: NormalizedFact, extras?: Partial<DisplayFact>): DisplayFact {
  return {
    ...fact,
    alternateSourceLabels: extras?.alternateSourceLabels ?? [],
    collapsedFactKeys: extras?.collapsedFactKeys ?? [],
  };
}

export function categorizeFactSection(fact: NormalizedFact): Gate1SectionId {
  const key = fact.key.toLowerCase();
  const label = fact.label.toLowerCase();

  if (key.startsWith("grant.") || key.startsWith("reporting.annual_review") || key.startsWith("reporting.period")) {
    return "programme_summary";
  }
  if (key.startsWith("objectives.")) {
    return "objectives";
  }
  if (key.startsWith("indicators.")) {
    return "indicators";
  }
  if (key.startsWith("financials.")) {
    return "financials";
  }
  if (key.startsWith("reporting.")) {
    return "reporting";
  }

  if (/\b(op\d|ocm\d)\b/i.test(fact.label) && /\b(actual|target|indicator)\b/i.test(label)) {
    return "indicators";
  }

  if (/\b(spend|budget|financial|currency)\b/i.test(label)) {
    if (/output\s*\d/i.test(label) || /year\s*\d/i.test(label) || label.includes("financial")) {
      return "financials";
    }
    if (/\b(award|programme|approved|contribution|contract)\b/i.test(label) && label.includes("budget")) {
      return "programme_summary";
    }
    if (label.includes("currency")) {
      return "financials";
    }
  }

  if (/\b(funder|grant reference|grant_period|reference code|programme start|programme end|reporting period|grant period)\b/i.test(label)) {
    return "programme_summary";
  }
  if (/\b(objective|outcome|impact|activit)/i.test(label)) {
    return "objectives";
  }
  if (/\b(reporting obligation|obligation|annual review|disaggregated monitoring)\b/i.test(label)) {
    return "reporting";
  }

  return "other";
}

export function dedupeFactsForDegraded(facts: NormalizedFact[]): {
  displayFacts: DisplayFact[];
  clientPromotedConflicts: ClientPromotedConflict[];
  hiddenFactKeys: Set<string>;
} {
  const byLabel = new Map<string, NormalizedFact[]>();

  for (const fact of facts) {
    const labelKey = normalizeLabel(fact.label);
    const group = byLabel.get(labelKey) ?? [];
    group.push(fact);
    byLabel.set(labelKey, group);
  }

  const displayFacts: DisplayFact[] = [];
  const clientPromotedConflicts: ClientPromotedConflict[] = [];
  const hiddenFactKeys = new Set<string>();

  for (const [labelKey, group] of byLabel.entries()) {
    const byValue = new Map<string, NormalizedFact[]>();
    for (const fact of group) {
      const valueKey = `${JSON.stringify(fact.value)}::${fact.unit ?? ""}`;
      const bucket = byValue.get(valueKey) ?? [];
      bucket.push(fact);
      byValue.set(valueKey, bucket);
    }

    if (byValue.size > 1) {
      clientPromotedConflicts.push({
        id: labelKey,
        label: group[0]?.label ?? labelKey,
        values: group.map((fact) => ({
          factKey: fact.key,
          value: fact.value,
          unit: fact.unit,
          displayText: formatFactValue(fact.value, fact.unit),
          sourceLabel: fact.sourceLabel,
        })),
        isResolved: false,
        resolvedValue: null,
      });
      continue;
    }

    const bucket = [...byValue.values()][0] ?? group;
    const primary = bucket[0];
    if (!primary) {
      continue;
    }

    const alternateSourceLabels = bucket.slice(1).map((fact) => fact.sourceLabel);
    const collapsedFactKeys = bucket.slice(1).map((fact) => fact.key);
    for (const key of collapsedFactKeys) {
      hiddenFactKeys.add(key);
    }

    displayFacts.push(
      toDisplayFact(primary, {
        alternateSourceLabels,
        collapsedFactKeys,
      }),
    );
  }

  return { displayFacts, clientPromotedConflicts, hiddenFactKeys };
}

type IndicatorField = "y1_target" | "y1_actual" | "endline_target";

function parseIndicatorField(fact: DisplayFact): { rowId: string; label: string; field: IndicatorField } | null {
  const key = fact.key;
  const label = fact.label;

  const canonical = key.match(/^indicators\.([^.]+)\.(y1_target|y1_actual|proposal_endline_target)$/i);
  if (canonical) {
    const field =
      canonical[2] === "proposal_endline_target"
        ? "endline_target"
        : (canonical[2] as IndicatorField);
    return { rowId: canonical[1], label, field };
  }

  const opMatch = label.match(/\(?\b(op\d+\.?\d*|ocm\d+)\b\)?/i);
  if (!opMatch) {
    return null;
  }

  const rowId = opMatch[1].toLowerCase().replace(".", "_");
  const lower = label.toLowerCase();
  if (lower.includes("actual")) {
    return { rowId, label, field: "y1_actual" };
  }
  if (lower.includes("endline") || lower.includes("proposal")) {
    return { rowId, label, field: "endline_target" };
  }
  if (lower.includes("target")) {
    return { rowId, label, field: "y1_target" };
  }

  return null;
}

export function buildIndicatorTable(facts: DisplayFact[]): IndicatorTableRow[] {
  const rows = new Map<string, IndicatorTableRow>();

  for (const fact of facts) {
    const meta = parseIndicatorField(fact);
    if (!meta) {
      continue;
    }

    const existing =
      rows.get(meta.rowId) ??
      ({
        rowId: meta.rowId,
        label: meta.label.replace(/\s*—.*$/i, "").replace(/\s*\(.*\)\s*$/, "").trim(),
        y1Target: null,
        y1Actual: null,
        endlineTarget: null,
        unit: fact.unit,
      } satisfies IndicatorTableRow);

    if (meta.field === "y1_target") {
      existing.y1Target = fact;
    } else if (meta.field === "y1_actual") {
      existing.y1Actual = fact;
    } else {
      existing.endlineTarget = fact;
    }
    if (!existing.unit && fact.unit) {
      existing.unit = fact.unit;
    }

    rows.set(meta.rowId, existing);
  }

  return [...rows.values()].sort((a, b) => a.rowId.localeCompare(b.rowId));
}

type FinancialField = "budget" | "actual" | "currency";

function parseFinancialField(fact: DisplayFact): { rowId: string; label: string; field: FinancialField } | null {
  const key = fact.key;
  const label = fact.label;

  const canonical = key.match(/^financials\.lines\.([^.]+)\.(y1_budget|y1_actual)$/i);
  if (canonical) {
    return {
      rowId: canonical[1],
      label,
      field: canonical[2] === "y1_budget" ? "budget" : "actual",
    };
  }

  if (key.match(/^financials\.y1_(budget|actual)\.total$/i)) {
    return { rowId: "total", label, field: key.includes("budget") ? "budget" : "actual" };
  }

  const lower = label.toLowerCase();
  if (lower.includes("currency") && !lower.includes("output")) {
    return { rowId: "_currency", label, field: "currency" };
  }

  const outputMatch = label.match(/output\s*(\d+(?:\.\d+)?)/i);
  if (!outputMatch) {
    if (lower.includes("total") && (lower.includes("budget") || lower.includes("spend"))) {
      return {
        rowId: "total",
        label,
        field: lower.includes("budget") ? "budget" : "actual",
      };
    }
    return null;
  }

  const rowId = `op${outputMatch[1].replace(".", "_")}`;
  if (lower.includes("budget")) {
    return { rowId, label, field: "budget" };
  }
  if (lower.includes("actual") || lower.includes("spend")) {
    return { rowId, label, field: "actual" };
  }

  return null;
}

export function buildFinancialTable(facts: DisplayFact[]): FinancialTableRow[] {
  const rows = new Map<string, FinancialTableRow>();
  let globalCurrency: string | null = null;

  for (const fact of facts) {
    const meta = parseFinancialField(fact);
    if (!meta) {
      continue;
    }

    if (meta.field === "currency") {
      globalCurrency = String(fact.value ?? "");
      continue;
    }

    const existing =
      rows.get(meta.rowId) ??
      ({
        rowId: meta.rowId,
        label: meta.label.replace(/\s*—.*$/i, "").replace(/\s*[–-]\s*(budget|actual spend).*$/i, "").trim(),
        budget: null,
        actual: null,
        currency: null,
      } satisfies FinancialTableRow);

    if (meta.field === "budget") {
      existing.budget = fact;
    } else {
      existing.actual = fact;
    }

    rows.set(meta.rowId, existing);
  }

  const table = [...rows.values()].sort((a, b) => a.rowId.localeCompare(b.rowId));
  if (globalCurrency) {
    for (const row of table) {
      row.currency = globalCurrency;
    }
  } else {
    for (const row of table) {
      row.currency = row.budget?.unit ?? row.actual?.unit ?? null;
    }
  }

  return table;
}

function assignToSections(facts: DisplayFact[]): Gate1Sections {
  const sections: Gate1Sections = {
    programmeSummary: [],
    indicators: [],
    indicatorTable: [],
    financials: [],
    financialTable: [],
    objectives: [],
    reporting: [],
    other: [],
  };

  for (const fact of facts) {
    const section = categorizeFactSection(fact);
    switch (section) {
      case "programme_summary":
        sections.programmeSummary.push(fact);
        break;
      case "indicators":
        sections.indicators.push(fact);
        break;
      case "financials":
        sections.financials.push(fact);
        break;
      case "objectives":
        sections.objectives.push(fact);
        break;
      case "reporting":
        sections.reporting.push(fact);
        break;
      default:
        sections.other.push(fact);
    }
  }

  sections.indicatorTable = buildIndicatorTable(sections.indicators);
  sections.financialTable = buildFinancialTable(sections.financials);

  const tableIndicatorKeys = new Set(
    sections.indicatorTable.flatMap((row) =>
      [row.y1Target, row.y1Actual, row.endlineTarget].filter(Boolean).map((fact) => fact!.key),
    ),
  );
  sections.indicators = sections.indicators.filter((fact) => !tableIndicatorKeys.has(fact.key));

  const tableFinancialKeys = new Set(
    sections.financialTable.flatMap((row) =>
      [row.budget, row.actual].filter(Boolean).map((fact) => fact!.key),
    ),
  );
  sections.financials = sections.financials.filter((fact) => !tableFinancialKeys.has(fact.key));

  return sections;
}

export function buildGate1LayoutView(knowledgeBank: KnowledgeBankResponse): Gate1LayoutView {
  const isDegraded = knowledgeBank.reconciliation_outcome === "degraded";
  const conflicts = normalizeConflicts(knowledgeBank.conflicts);
  const unresolvedConflictKeys = new Set(
    conflicts.filter((conflict) => !conflict.isResolved).map((conflict) => conflict.factKey),
  );
  const rawFacts = normalizeFacts(knowledgeBank.facts, unresolvedConflictKeys);

  let displayFacts: DisplayFact[];
  let clientPromotedConflicts: ClientPromotedConflict[] = [];

  if (isDegraded) {
    const deduped = dedupeFactsForDegraded(rawFacts);
    displayFacts = deduped.displayFacts;
    clientPromotedConflicts = deduped.clientPromotedConflicts;
  } else {
    displayFacts = rawFacts.map((fact) => toDisplayFact(fact));
  }

  return {
    isDegraded,
    rawFactCount: rawFacts.length,
    displayFactCount: displayFacts.length,
    conflicts,
    unresolvedConflicts: conflicts.filter((conflict) => !conflict.isResolved),
    clientPromotedConflicts,
    unresolvedClientConflicts: clientPromotedConflicts.filter((conflict) => !conflict.isResolved),
    sections: assignToSections(displayFacts),
    unreadableSources: normalizeUnreadableSources(knowledgeBank.unreadable_sources),
  };
}

export function isClientConflictResolved(conflict: ClientPromotedConflict, resolvedIds: Set<string>): boolean {
  return resolvedIds.has(conflict.id) || conflict.isResolved;
}

export function clientConflictValuesMatch(left: unknown, right: unknown): boolean {
  return valuesEqual(left, right);
}

export type Gate1ReviewClusterId =
  | "programme_summary"
  | "indicators"
  | "financials"
  | "objectives_and_reporting"
  | "other";

export type Gate1ReviewCluster = {
  clusterId: Gate1ReviewClusterId;
  title: string;
  description: string;
  factKeys: string[];
  needsPromotionKeys: string[];
  hasUnverified: boolean;
  hasDegraded: boolean;
  factCount: number;
};

function collectFactKeys(sections: Gate1Sections, clusterId: Gate1ReviewClusterId): string[] {
  const keys: string[] = [];
  const push = (facts: DisplayFact[]) => {
    for (const fact of facts) {
      keys.push(fact.key);
      keys.push(...fact.collapsedFactKeys);
    }
  };

  switch (clusterId) {
    case "programme_summary":
      push(sections.programmeSummary);
      break;
    case "indicators":
      push(sections.indicators);
      for (const row of sections.indicatorTable) {
        for (const cell of [row.y1Target, row.y1Actual, row.endlineTarget]) {
          if (cell) {
            keys.push(cell.key, ...cell.collapsedFactKeys);
          }
        }
      }
      break;
    case "financials":
      push(sections.financials);
      for (const row of sections.financialTable) {
        for (const cell of [row.budget, row.actual]) {
          if (cell) {
            keys.push(cell.key, ...cell.collapsedFactKeys);
          }
        }
      }
      break;
    case "objectives_and_reporting":
      push(sections.objectives);
      push(sections.reporting);
      break;
    case "other":
      push(sections.other);
      break;
    default:
      break;
  }

  return [...new Set(keys)];
}

export function buildGate1ReviewClusters(layout: Gate1LayoutView): Gate1ReviewCluster[] {
  const clusterMeta: Array<{
    clusterId: Gate1ReviewClusterId;
    title: string;
    description: string;
  }> = [
    {
      clusterId: "programme_summary",
      title: "Programme summary",
      description: "Grant reference, reporting period, and programme context from your documents.",
    },
    {
      clusterId: "indicators",
      title: "Indicators",
      description: "Targets and actuals extracted from your logframe and indicator files.",
    },
    {
      clusterId: "financials",
      title: "Financials by output",
      description: "Budget and spend figures grouped by programme output.",
    },
    {
      clusterId: "objectives_and_reporting",
      title: "Objectives and reporting",
      description: "Outcome objectives and funder reporting obligations.",
    },
    {
      clusterId: "other",
      title: "Other details",
      description: "Additional facts that did not fit the sections above.",
    },
  ];

  const allFacts = [
    ...layout.sections.programmeSummary,
    ...layout.sections.indicators,
    ...layout.sections.financials,
    ...layout.sections.objectives,
    ...layout.sections.reporting,
    ...layout.sections.other,
    ...layout.sections.indicatorTable.flatMap((row) =>
      [row.y1Target, row.y1Actual, row.endlineTarget].filter(Boolean),
    ),
    ...layout.sections.financialTable.flatMap((row) => [row.budget, row.actual].filter(Boolean)),
  ] as DisplayFact[];

  const factByKey = new Map(allFacts.map((fact) => [fact.key, fact]));

  return clusterMeta
    .map(({ clusterId, title, description }) => {
      const factKeys = collectFactKeys(layout.sections, clusterId);
      const clusterFacts = factKeys
        .map((key) => factByKey.get(key))
        .filter((fact): fact is DisplayFact => Boolean(fact));
      const needsPromotionKeys = clusterFacts.filter((fact) => fact.needsPromotion).map((fact) => fact.key);
      return {
        clusterId,
        title,
        description,
        factKeys,
        needsPromotionKeys,
        hasUnverified: needsPromotionKeys.length > 0,
        hasDegraded: layout.isDegraded && clusterFacts.some((fact) => fact.needsPromotion),
        factCount: factKeys.length,
      };
    })
    .filter((cluster) => cluster.factCount > 0);
}
