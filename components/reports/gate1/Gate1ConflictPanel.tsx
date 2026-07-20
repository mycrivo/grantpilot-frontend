"use client";

import { useState } from "react";

import { GATE1_LABEL } from "@/components/reports/report-status-labels";
import {
  composeExplicitEntryContext,
  nextExplicitEntryStateAfterSaveAttempt,
  routeConflictCandidateSelection,
} from "@/lib/gate1-conflict-routing";
import type { NormalizedConflict, NormalizedConflictValue } from "@/lib/knowledge-bank-view";
import { formatFactValue } from "@/lib/knowledge-bank-view";

type Gate1ConflictPanelProps = {
  conflict: NormalizedConflict;
  saving: boolean;
  onResolve: (factKey: string, resolvedValue: unknown) => Promise<void>;
};

function valuesMatch(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function Gate1ConflictPanel({ conflict, saving, onResolve }: Gate1ConflictPanelProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [entryContext, setEntryContext] = useState<string | null>(null);

  const openExplicitEntry = (option?: NormalizedConflictValue) => {
    setShowCustom(true);
    setCustomValue("");
    setEntryContext(
      composeExplicitEntryContext(
        option
          ? { sourceLabel: option.sourceLabel, provenanceExcerpt: option.provenanceExcerpt }
          : undefined,
      ),
    );
  };

  const handleSelect = async (option: NormalizedConflictValue) => {
    const route = routeConflictCandidateSelection(option.value);
    if (route.kind === "explicit_entry") {
      openExplicitEntry(option);
      return;
    }
    setShowCustom(false);
    setEntryContext(null);
    await onResolve(conflict.factKey, route.value);
  };

  const handleCustomSave = async () => {
    if (!customValue.trim()) {
      return;
    }
    const draft = customValue.trim();
    try {
      await onResolve(conflict.factKey, draft);
      const next = nextExplicitEntryStateAfterSaveAttempt({ draft, saveSucceeded: true });
      setShowCustom(next.showCustom);
      setCustomValue(next.customValue);
      if (next.entryContextCleared) {
        setEntryContext(null);
      }
    } catch {
      const next = nextExplicitEntryStateAfterSaveAttempt({ draft, saveSucceeded: false });
      setShowCustom(next.showCustom);
      setCustomValue(next.customValue);
    }
  };

  return (
    <div
      className="rounded-[12px] border border-brand-warning/30 bg-brand-warning/5 p-4"
      role="group"
      aria-label={GATE1_LABEL.CONFLICT_HEADING}
    >
      <div className="flex items-start gap-2">
        <span className="font-bold text-brand-warning" aria-hidden="true">
          !
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-brand-text-primary">{GATE1_LABEL.CONFLICT_HEADING}</h2>
          <p className="mt-1 text-sm text-secondary">{GATE1_LABEL.CONFLICT_SUBHEADING}</p>
          <p className="mt-2 text-sm text-secondary">{conflict.explanation}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {conflict.values.map((option, index) => {
          const route = routeConflictCandidateSelection(option.value);
          const isSelected =
            conflict.isResolved &&
            route.kind === "save" &&
            valuesMatch(conflict.resolvedValue, option.value);

          return (
            <button
              key={`${conflict.factKey}-${index}`}
              type="button"
              aria-pressed={isSelected}
              disabled={saving}
              className={[
                "flex w-full flex-col rounded-[8px] border px-4 py-3 text-left transition-colors",
                isSelected
                  ? "border-brand-primary bg-brand-primary/5"
                  : "border-brand-border bg-brand-card-bg hover:border-brand-primary/40",
              ].join(" ")}
              onClick={() => void handleSelect(option)}
            >
              <span className="font-semibold text-brand-text-primary">{option.displayText}</span>
              <span className="mt-1 text-sm text-secondary">{option.sourceLabel}</span>
            </button>
          );
        })}

        <button
          type="button"
          className="w-full rounded-[8px] border border-dashed border-brand-border bg-brand-card-bg px-4 py-3 text-left text-sm font-semibold text-brand-primary hover:border-brand-primary"
          disabled={saving}
          onClick={() => openExplicitEntry()}
        >
          {GATE1_LABEL.CONFLICT_ENTER_OTHER}
        </button>

        {showCustom ? (
          <div className="space-y-2 rounded-[8px] border border-brand-border bg-brand-card-bg px-3 py-3">
            <p className="text-sm font-semibold text-brand-text-primary">
              {GATE1_LABEL.CONFLICT_ENTER_TITLE}
            </p>
            {entryContext ? <p className="text-sm text-secondary">{entryContext}</p> : null}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={customValue}
                onChange={(event) => setCustomValue(event.target.value)}
                placeholder={GATE1_LABEL.CONFLICT_ENTER_OTHER_PROMPT}
                className="min-w-[12rem] flex-1 rounded-[8px] border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-primary"
                disabled={saving}
              />
              <button
                type="button"
                className="btn-primary text-sm disabled:opacity-60"
                disabled={saving || !customValue.trim()}
                onClick={() => void handleCustomSave()}
              >
                {saving ? GATE1_LABEL.SAVING : GATE1_LABEL.FACT_SAVE}
              </button>
            </div>
          </div>
        ) : null}

        {conflict.isResolved && !showCustom ? (
          <p className="text-sm text-secondary">
            Selected value: {formatFactValue(conflict.resolvedValue)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
