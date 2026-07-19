import { describe, expect, it } from "vitest";

import { GATE1_LABEL } from "@/components/reports/report-status-labels";
import {
  composeExplicitEntryContext,
  nextExplicitEntryStateAfterSaveAttempt,
  routeClientConflictCandidateSelection,
  routeConflictCandidateSelection,
} from "@/lib/gate1-conflict-routing";
import {
  composeConflictExplanation,
  isAmbiguousConflictValue,
  normalizeConflicts,
  normalizeFacts,
} from "@/lib/knowledge-bank-view";
import {
  GATE1_SAVE_ERROR_MESSAGE,
  ME_401_MESSAGE,
  ME_5XX_LOAD_MESSAGE,
  ME_5XX_SAVE_MESSAGE,
  ME_ERROR_MESSAGE,
  ME_GENERIC_ERROR_MESSAGE,
  resolveFriendlyApiErrorMessage,
  resolveGate1SaveErrorMessage,
} from "@/lib/me-error-messages";

const INTERNAL_ID_PATTERN =
  /\b(reporting_period\.|fact_key|KB_|GATE1_|GATE2_|GATE3_|reconciler|agent_trace|error_code)\b/i;

describe("Gate 1 conflict normalization (D-059 / Amendment 3)", () => {
  it("marks null candidates as explicit-entry-only and composes a safe explanation", () => {
    const conflicts = normalizeConflicts(
      [
        {
          fact_key: "reporting_period.end",
          conflict_type: "VALUE_MISMATCH",
          annotation: "internal slug reporting_period.end must not appear",
          values: [
            {
              value: "2025-10-14",
              source_label: "Award Letter.docx",
              provenance: { excerpt: "to 14 October 2025" },
            },
            {
              value: null,
              source_label: "Award Letter.docx",
              provenance: { excerpt: "October to September" },
            },
          ],
        },
      ],
      {
        "reporting_period.end": {
          semantic_label: "First Annual Review reporting period end date",
        },
      },
    );

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].values[1].requiresExplicitEntry).toBe(true);
    expect(conflicts[0].values[1].displayText).toBe(GATE1_LABEL.CONFLICT_AMBIGUOUS_LABEL);
    expect(conflicts[0].explanation).toContain("First Annual Review reporting period end date");
    expect(conflicts[0].explanation).toContain("Award Letter.docx");
    expect(conflicts[0].explanation).toMatch(/One source mentions/i);
    expect(conflicts[0].explanation).not.toMatch(INTERNAL_ID_PATTERN);
    expect(conflicts[0]).not.toHaveProperty("annotation");
  });

  it("hides provenance-only siblings from ordinary fact rows", () => {
    const facts = normalizeFacts(
      {
        "reporting_period.end": {
          value: null,
          semantic_label: "Reporting period end",
          verification_status: "unverified",
        },
        "reporting_period.end_formal": {
          value: "2025-10-14",
          semantic_label: "Formal",
          provenance_only_for: "reporting_period.end",
          verification_status: "reconciled",
        },
      },
      new Set(),
    );
    expect(facts.map((f) => f.key)).toEqual(["reporting_period.end"]);
  });

  it("treats blank string as ambiguous", () => {
    expect(isAmbiguousConflictValue(null)).toBe(true);
    expect(isAmbiguousConflictValue("")).toBe(true);
    expect(isAmbiguousConflictValue("2025-10-14")).toBe(false);
  });

  it("composes accurate explanations for multiple and all-ambiguous shapes", () => {
    const twoAmbiguous = composeConflictExplanation({}, "Period end", [
      {
        value: null,
        unit: null,
        displayText: GATE1_LABEL.CONFLICT_AMBIGUOUS_LABEL,
        sourceLabel: "A.docx",
        provenanceExcerpt: null,
        requiresExplicitEntry: true,
      },
      {
        value: "   ",
        unit: null,
        displayText: GATE1_LABEL.CONFLICT_AMBIGUOUS_LABEL,
        sourceLabel: "B.docx",
        provenanceExcerpt: null,
        requiresExplicitEntry: true,
      },
    ]);
    expect(twoAmbiguous).toMatch(/None of the sources give a clear value/);

    const multiAmbiguous = composeConflictExplanation({}, "Period end", [
      {
        value: "2025-10-14",
        unit: null,
        displayText: "2025-10-14",
        sourceLabel: "A.docx",
        provenanceExcerpt: null,
        requiresExplicitEntry: false,
      },
      {
        value: null,
        unit: null,
        displayText: GATE1_LABEL.CONFLICT_AMBIGUOUS_LABEL,
        sourceLabel: "B.docx",
        provenanceExcerpt: null,
        requiresExplicitEntry: true,
      },
      {
        value: "",
        unit: null,
        displayText: GATE1_LABEL.CONFLICT_AMBIGUOUS_LABEL,
        sourceLabel: "C.docx",
        provenanceExcerpt: null,
        requiresExplicitEntry: true,
      },
    ]);
    expect(multiAmbiguous).toMatch(/Some sources mention values that aren't specific enough/);
  });
});

describe("conflict candidate routing (B1/B2) — both panels", () => {
  it("routes concrete candidates to save and ambiguous to explicit entry", () => {
    expect(routeConflictCandidateSelection("2025-10-14")).toEqual({
      kind: "save",
      value: "2025-10-14",
    });
    expect(routeConflictCandidateSelection(null)).toEqual({ kind: "explicit_entry" });
    expect(routeConflictCandidateSelection("")).toEqual({ kind: "explicit_entry" });
    expect(routeConflictCandidateSelection("   ")).toEqual({ kind: "explicit_entry" });
  });

  it("degraded client card never emits empty or whitespace resolved values", () => {
    expect(routeClientConflictCandidateSelection(null)).toEqual({ kind: "explicit_entry" });
    expect(routeClientConflictCandidateSelection("")).toEqual({ kind: "explicit_entry" });
    expect(routeClientConflictCandidateSelection("   ")).toEqual({ kind: "explicit_entry" });
    expect(routeClientConflictCandidateSelection("2025-10-14")).toEqual({
      kind: "save",
      resolvedValue: "2025-10-14",
    });
    // Mutation-witness target: if the ambiguous guard is removed from
    // routeConflictCandidateSelection, this assertion fails (empty string save).
    const emptyRoute = routeClientConflictCandidateSelection(null);
    expect(emptyRoute.kind).not.toBe("save");
    if (emptyRoute.kind === "save") {
      expect(emptyRoute.resolvedValue.trim().length).toBeGreaterThan(0);
    }
  });

  it("preserves explicit-entry draft when save fails", () => {
    const failed = nextExplicitEntryStateAfterSaveAttempt({
      draft: "owner typed value",
      saveSucceeded: false,
    });
    expect(failed.showCustom).toBe(true);
    expect(failed.customValue).toBe("owner typed value");
    expect(failed.entryContextCleared).toBe(false);

    const ok = nextExplicitEntryStateAfterSaveAttempt({
      draft: "owner typed value",
      saveSucceeded: true,
    });
    expect(ok.showCustom).toBe(false);
    expect(ok.customValue).toBe("");
  });
});

describe("Gate 1 save error copy (D-062)", () => {
  const knownCodes = [
    "KB_CONFLICT_RESOLUTION_VALUE_REQUIRED",
    "KB_PATCH_VALIDATION_FAILED",
    "USE_GATE1_CONFIRM_ENDPOINT",
    "GATE_NOT_SATISFIED",
    "GATE1_VALIDATION_FAILED",
    "VALIDATION_ERROR",
    "DONOR_REPORT_NOT_FOUND",
    "REPORT_NOT_FOUND",
  ] as const;

  it("maps every known Gate 1 save code to designed copy without internal identifiers", () => {
    for (const code of knownCodes) {
      const message = resolveGate1SaveErrorMessage({ errorCode: code, status: 422 });
      expect(message).toBe(ME_ERROR_MESSAGE[code]);
      expect(message).not.toMatch(INTERNAL_ID_PATTERN);
      expect(message).not.toBe(ME_GENERIC_ERROR_MESSAGE);
    }
  });

  it("uses generic banner only for unknown codes", () => {
    expect(
      resolveGate1SaveErrorMessage({ errorCode: "TOTALLY_UNKNOWN_CODE", status: 422 }),
    ).toBe(ME_GENERIC_ERROR_MESSAGE);
  });

  it("splits 5xx copy by surface and keeps GATE_NOT_SATISFIED gate-agnostic", () => {
    expect(resolveGate1SaveErrorMessage({ status: 500 })).toBe(ME_5XX_SAVE_MESSAGE);
    expect(resolveFriendlyApiErrorMessage({ status: 500 }, ME_GENERIC_ERROR_MESSAGE, "load")).toBe(
      ME_5XX_LOAD_MESSAGE,
    );
    expect(ME_ERROR_MESSAGE.GATE_NOT_SATISFIED).toMatch(/This step isn't available/i);
    expect(ME_ERROR_MESSAGE.GATE_NOT_SATISFIED).not.toMatch(/project facts/i);
  });

  it("scans all newly added Gate 1 save strings for internal identifiers", () => {
    const packageStrings = [
      ...Object.values(GATE1_SAVE_ERROR_MESSAGE),
      ME_401_MESSAGE,
      ME_5XX_SAVE_MESSAGE,
      ME_5XX_LOAD_MESSAGE,
      GATE1_LABEL.CONFLICT_HEADING,
      GATE1_LABEL.CONFLICT_SUBHEADING,
      GATE1_LABEL.CONFLICT_ENTER_TITLE,
      GATE1_LABEL.CONFLICT_ENTER_HELPER,
      GATE1_LABEL.CONFLICT_ENTER_OTHER_PROMPT,
      GATE1_LABEL.CONFLICT_AMBIGUOUS_HINT,
      GATE1_LABEL.CONFLICT_AMBIGUOUS_LABEL,
      composeExplicitEntryContext({
        sourceLabel: "Award Letter.docx",
        provenanceExcerpt: "October to September",
      }),
      composeExplicitEntryContext({ sourceLabel: "Award Letter.docx" }),
      composeExplicitEntryContext(),
      composeConflictExplanation({}, "Reporting period end", [
        {
          value: "2025-10-14",
          unit: null,
          displayText: "2025-10-14",
          sourceLabel: "Award Letter.docx",
          provenanceExcerpt: null,
          requiresExplicitEntry: false,
        },
        {
          value: null,
          unit: null,
          displayText: GATE1_LABEL.CONFLICT_AMBIGUOUS_LABEL,
          sourceLabel: "Award Letter.docx",
          provenanceExcerpt: "October to September",
          requiresExplicitEntry: true,
        },
      ]),
      composeConflictExplanation({}, "this item", [
        {
          value: null,
          unit: null,
          displayText: GATE1_LABEL.CONFLICT_AMBIGUOUS_LABEL,
          sourceLabel: "",
          provenanceExcerpt: null,
          requiresExplicitEntry: true,
        },
        {
          value: "",
          unit: null,
          displayText: GATE1_LABEL.CONFLICT_AMBIGUOUS_LABEL,
          sourceLabel: "",
          provenanceExcerpt: null,
          requiresExplicitEntry: true,
        },
      ]),
      composeConflictExplanation({}, "Period end", [
        {
          value: "a",
          unit: null,
          displayText: "a",
          sourceLabel: "A.docx",
          provenanceExcerpt: null,
          requiresExplicitEntry: false,
        },
        {
          value: "b",
          unit: null,
          displayText: "b",
          sourceLabel: "B.docx",
          provenanceExcerpt: null,
          requiresExplicitEntry: false,
        },
      ]),
    ];
    for (const text of packageStrings) {
      expect(text).not.toMatch(INTERNAL_ID_PATTERN);
    }
  });
});
