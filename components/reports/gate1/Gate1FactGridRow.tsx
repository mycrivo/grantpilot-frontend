"use client";

import { useState } from "react";

import { GATE1_LABEL } from "@/components/reports/report-status-labels";
import type { DisplayFact } from "@/lib/knowledge-bank-gate1-layout";
import { formatFactValue } from "@/lib/knowledge-bank-view";

type Gate1FactGridRowProps = {
  fact: DisplayFact;
  saving: boolean;
  compact?: boolean;
  onSave: (factKey: string, value: string) => Promise<void>;
};

export function Gate1FactGridRow({ fact, saving, compact = false, onSave }: Gate1FactGridRowProps) {
  const [editing, setEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(String(fact.value ?? ""));

  const handleSave = async () => {
    await onSave(fact.key, draftValue);
    setEditing(false);
  };

  return (
    <div
      className={[
        "grid gap-2 border-b border-brand-border/60 py-2 last:border-b-0",
        compact ? "grid-cols-1" : "grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] items-start",
      ].join(" ")}
    >
      {!compact ? (
        <span className="text-sm font-medium text-secondary">{fact.label}</span>
      ) : null}

      <div className="min-w-0">
        {editing ? (
          <input
            type="text"
            value={draftValue}
            onChange={(event) => setDraftValue(event.target.value)}
            className="w-full rounded-[8px] border border-brand-border px-3 py-1.5 text-sm outline-none focus:border-brand-primary"
            aria-label={`Edit ${fact.label}`}
          />
        ) : (
          <p className="text-sm font-semibold text-brand-text-primary">
            {compact ? (
              <>
                <span className="font-medium text-secondary">{fact.label}: </span>
                {formatFactValue(fact.value, fact.unit)}
              </>
            ) : (
              formatFactValue(fact.value, fact.unit)
            )}
          </p>
        )}
        <p className="mt-0.5 text-xs text-secondary">
          {GATE1_LABEL.SOURCE_PREFIX} {fact.sourceLabel}
        </p>
        {fact.alternateSourceLabels.length > 0 ? (
          <p className="mt-1 text-xs text-secondary">
            {GATE1_LABEL.ALSO_FOUND_IN}{" "}
            {fact.alternateSourceLabels.join(", ")}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 justify-self-end">
        {fact.confirmed ? (
          <span className="rounded-full border border-brand-primary/30 bg-brand-primary/5 px-2 py-0.5 text-xs font-semibold text-brand-primary">
            {GATE1_LABEL.FACT_CONFIRMED}
          </span>
        ) : null}
        {fact.needsPromotion ? (
          <span className="rounded-full border border-brand-warning/40 bg-brand-warning/10 px-2 py-0.5 text-xs font-semibold text-brand-warning">
            Needs review
          </span>
        ) : null}
        {editing ? (
          <>
            <button
              type="button"
              className="text-xs font-semibold text-brand-primary disabled:opacity-60"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              {saving ? GATE1_LABEL.SAVING : GATE1_LABEL.FACT_SAVE}
            </button>
            <button
              type="button"
              className="text-xs font-semibold text-secondary"
              disabled={saving}
              onClick={() => {
                setDraftValue(formatFactValue(fact.value, fact.unit));
                setEditing(false);
              }}
            >
              {GATE1_LABEL.FACT_CANCEL}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="text-xs font-semibold text-brand-primary hover:underline"
            onClick={() => {
              setDraftValue(String(fact.value ?? ""));
              setEditing(true);
            }}
          >
            {GATE1_LABEL.FACT_EDIT}
          </button>
        )}
      </div>
    </div>
  );
}
