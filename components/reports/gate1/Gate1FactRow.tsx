"use client";

import { useState } from "react";

import { GATE1_LABEL } from "@/components/reports/report-status-labels";
import type { NormalizedFact } from "@/lib/knowledge-bank-view";
import { formatFactValue } from "@/lib/knowledge-bank-view";

type Gate1FactRowProps = {
  fact: NormalizedFact;
  saving: boolean;
  onSave: (factKey: string, value: string) => Promise<void>;
};

export function Gate1FactRow({ fact, saving, onSave }: Gate1FactRowProps) {
  const [editing, setEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(String(fact.value ?? ""));

  const handleSave = async () => {
    await onSave(fact.key, draftValue);
    setEditing(false);
  };

  return (
    <div className="flex flex-wrap items-start gap-3 rounded-[8px] border border-brand-border bg-brand-card-bg px-4 py-3">
      <span className="mt-0.5 text-brand-primary" aria-hidden="true">
        ✓
      </span>
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            type="text"
            value={draftValue}
            onChange={(event) => setDraftValue(event.target.value)}
            className="w-full rounded-[8px] border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-primary"
            aria-label={`Edit ${fact.label}`}
          />
        ) : (
          <p className="font-medium text-brand-text-primary">{fact.displayText}</p>
        )}
        <p className="mt-1 text-sm text-secondary">
          {GATE1_LABEL.SOURCE_PREFIX} {fact.sourceLabel}
        </p>
      </div>
      {fact.confirmed ? (
        <span className="rounded-full border border-brand-primary/30 bg-brand-primary/5 px-2 py-0.5 text-xs font-semibold text-brand-primary">
          {GATE1_LABEL.FACT_CONFIRMED}
        </span>
      ) : null}
      {editing ? (
        <div className="flex gap-2">
          <button
            type="button"
            className="text-sm font-semibold text-brand-primary disabled:opacity-60"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? GATE1_LABEL.SAVING : GATE1_LABEL.FACT_SAVE}
          </button>
          <button
            type="button"
            className="text-sm font-semibold text-secondary"
            disabled={saving}
            onClick={() => {
              setDraftValue(formatFactValue(fact.value, fact.unit));
              setEditing(false);
            }}
          >
            {GATE1_LABEL.FACT_CANCEL}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="text-sm font-semibold text-brand-primary hover:underline"
          onClick={() => {
            setDraftValue(String(fact.value ?? ""));
            setEditing(true);
          }}
        >
          {GATE1_LABEL.FACT_EDIT}
        </button>
      )}
    </div>
  );
}
