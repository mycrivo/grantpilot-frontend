import { describe, expect, it } from "vitest";

import {
  buildFinancialTable,
  buildGate1LayoutView,
  buildIndicatorTable,
  categorizeFactSection,
  dedupeFactsForDegraded,
} from "@/lib/knowledge-bank-gate1-layout";
import type { NormalizedFact } from "@/lib/knowledge-bank-view";

function fact(overrides: Partial<NormalizedFact> & Pick<NormalizedFact, "key" | "label">): NormalizedFact {
  const value = overrides.value ?? "100";
  const unit = overrides.unit ?? null;
  return {
    value,
    unit,
    displayText: `${overrides.label}: ${value}`,
    sourceLabel: overrides.sourceLabel ?? "doc-a",
    confirmed: overrides.confirmed ?? false,
    ...overrides,
  };
}

describe("categorizeFactSection", () => {
  it("routes canonical grant keys to programme summary", () => {
    expect(categorizeFactSection(fact({ key: "grant.reference", label: "Grant reference" }))).toBe(
      "programme_summary",
    );
  });

  it("routes indicator labels to indicators section", () => {
    expect(
      categorizeFactSection(fact({ key: "degraded:1", label: "indicator actual (OP1.1)", value: "684" })),
    ).toBe("indicators");
  });

  it("routes output spend labels to financials", () => {
    expect(
      categorizeFactSection(
        fact({ key: "degraded:2", label: "Output 1: Girls re-enter — actual spend", value: "174850" }),
      ),
    ).toBe("financials");
  });
});

describe("dedupeFactsForDegraded", () => {
  it("collapses identical label+value+unit duplicates", () => {
    const { displayFacts, clientPromotedConflicts, hiddenFactKeys } = dedupeFactsForDegraded([
      fact({ key: "a", label: "Financials currency", value: "GBP", sourceLabel: "doc-a" }),
      fact({ key: "b", label: "Financials currency", value: "GBP", sourceLabel: "doc-b" }),
    ]);

    expect(displayFacts).toHaveLength(1);
    expect(displayFacts[0]?.alternateSourceLabels).toEqual(["doc-b"]);
    expect(displayFacts[0]?.collapsedFactKeys).toEqual(["b"]);
    expect(hiddenFactKeys.has("b")).toBe(true);
    expect(clientPromotedConflicts).toHaveLength(0);
  });

  it("promotes same label with different values to client conflicts", () => {
    const { displayFacts, clientPromotedConflicts } = dedupeFactsForDegraded([
      fact({ key: "a", label: "indicator target (OP1.1)", value: "650", sourceLabel: "proposal" }),
      fact({ key: "b", label: "indicator target (OP1.1)", value: "700", sourceLabel: "sheet" }),
    ]);

    expect(displayFacts).toHaveLength(0);
    expect(clientPromotedConflicts).toHaveLength(1);
    expect(clientPromotedConflicts[0]?.values).toHaveLength(2);
  });
});

describe("buildIndicatorTable", () => {
  it("groups canonical indicator facts into rows", () => {
    const rows = buildIndicatorTable([
      fact({
        key: "indicators.op1_1_girls.y1_target",
        label: "OP1.1 Year 1 target",
        value: "650",
        unit: "girls",
      }),
      fact({
        key: "indicators.op1_1_girls.y1_actual",
        label: "OP1.1 Year 1 actual",
        value: "684",
        unit: "girls",
      }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.y1Target?.value).toBe("650");
    expect(rows[0]?.y1Actual?.value).toBe("684");
  });
});

describe("buildFinancialTable", () => {
  it("groups output budget and actual lines", () => {
    const rows = buildFinancialTable([
      fact({
        key: "financials.lines.op1_1.y1_budget",
        label: "OP1.1 Year 1 budget",
        value: "162000",
        unit: "GBP",
      }),
      fact({
        key: "financials.lines.op1_1.y1_actual",
        label: "OP1.1 Year 1 actual spend",
        value: "174850",
        unit: "GBP",
      }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.budget?.value).toBe("162000");
    expect(rows[0]?.actual?.value).toBe("174850");
  });
});

describe("buildGate1LayoutView", () => {
  it("dedupes facts when reconciliation is degraded", () => {
    const view = buildGate1LayoutView({
      donor_report_id: "r1",
      facts: {
        a: { semantic_label: "Financials currency", value: "GBP", source_label: "doc-a" },
        b: { semantic_label: "Financials currency", value: "GBP", source_label: "doc-b" },
        c: { semantic_label: "Funder", value: "FCDO", source_label: "award" },
      },
      conflicts: [],
      gate1_confirmed_at: null,
      ready_for_gate1: true,
      reconciliation_outcome: "degraded",
    });

    expect(view.rawFactCount).toBe(3);
    expect(view.displayFactCount).toBe(2);
    expect(view.isDegraded).toBe(true);
  });
});
