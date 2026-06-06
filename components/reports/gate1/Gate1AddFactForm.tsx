"use client";

import { useState } from "react";

import { GATE1_LABEL } from "@/components/reports/report-status-labels";

type Gate1AddFactFormProps = {
  saving: boolean;
  onAdd: (label: string, value: string, sourceLabel: string) => Promise<void>;
};

export function Gate1AddFactForm({ saving, onAdd }: Gate1AddFactFormProps) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");

  const reset = () => {
    setLabel("");
    setValue("");
    setSourceLabel("");
    setOpen(false);
  };

  const handleSubmit = async () => {
    if (!label.trim() || !value.trim()) {
      return;
    }

    await onAdd(
      label.trim(),
      value.trim(),
      sourceLabel.trim() || GATE1_LABEL.USER_SOURCE_LABEL,
    );
    reset();
  };

  if (!open) {
    return (
      <button
        type="button"
        className="text-sm font-semibold text-brand-primary hover:underline"
        onClick={() => setOpen(true)}
      >
        {GATE1_LABEL.ADD_FACT}
      </button>
    );
  }

  return (
    <div className="rounded-[12px] border border-brand-border bg-brand-card-bg p-4">
      <h2 className="font-semibold text-brand-text-primary">{GATE1_LABEL.ADD_FACT_TITLE}</h2>
      <div className="mt-4 space-y-3">
        <div>
          <label htmlFor="gate1-add-label" className="mb-1 block text-sm font-semibold text-brand-text-primary">
            {GATE1_LABEL.ADD_FACT_LABEL}
          </label>
          <input
            id="gate1-add-label"
            type="text"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            className="w-full rounded-[8px] border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-primary"
          />
        </div>
        <div>
          <label htmlFor="gate1-add-value" className="mb-1 block text-sm font-semibold text-brand-text-primary">
            {GATE1_LABEL.ADD_FACT_VALUE}
          </label>
          <input
            id="gate1-add-value"
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="w-full rounded-[8px] border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-primary"
          />
        </div>
        <div>
          <label htmlFor="gate1-add-source" className="mb-1 block text-sm font-semibold text-brand-text-primary">
            {GATE1_LABEL.ADD_FACT_SOURCE}
          </label>
          <input
            id="gate1-add-source"
            type="text"
            value={sourceLabel}
            onChange={(event) => setSourceLabel(event.target.value)}
            placeholder={GATE1_LABEL.USER_SOURCE_LABEL}
            className="w-full rounded-[8px] border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-primary"
          />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className="btn-primary text-sm disabled:opacity-60"
          disabled={saving || !label.trim() || !value.trim()}
          onClick={() => void handleSubmit()}
        >
          {saving ? GATE1_LABEL.SAVING : GATE1_LABEL.ADD_FACT_SAVE}
        </button>
        <button type="button" className="text-sm font-semibold text-secondary" onClick={reset}>
          {GATE1_LABEL.FACT_CANCEL}
        </button>
      </div>
    </div>
  );
}
