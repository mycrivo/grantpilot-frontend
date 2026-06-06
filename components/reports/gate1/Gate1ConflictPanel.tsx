"use client";

import { useState } from "react";

import { GATE1_LABEL } from "@/components/reports/report-status-labels";
import type { NormalizedConflict } from "@/lib/knowledge-bank-view";
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

  const handleSelect = async (value: unknown) => {
    setShowCustom(false);
    await onResolve(conflict.factKey, value);
  };

  const handleCustomSave = async () => {
    if (!customValue.trim()) {
      return;
    }
    await onResolve(conflict.factKey, customValue.trim());
    setShowCustom(false);
    setCustomValue("");
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
          {conflict.annotation ? <p className="mt-2 text-sm text-secondary">{conflict.annotation}</p> : null}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {conflict.values.map((option, index) => {
          const isSelected =
            conflict.isResolved && valuesMatch(conflict.resolvedValue, option.value);

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
              onClick={() => void handleSelect(option.value)}
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
          onClick={() => setShowCustom((value) => !value)}
        >
          {GATE1_LABEL.CONFLICT_ENTER_OTHER}
        </button>

        {showCustom ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={customValue}
              onChange={(event) => setCustomValue(event.target.value)}
              placeholder={GATE1_LABEL.CONFLICT_ENTER_OTHER_PROMPT}
              className="min-w-[12rem] flex-1 rounded-[8px] border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-primary"
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
