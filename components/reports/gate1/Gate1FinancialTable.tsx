"use client";

import { useState } from "react";

import { GATE1_LABEL } from "@/components/reports/report-status-labels";
import type { FinancialTableRow } from "@/lib/knowledge-bank-gate1-layout";
import { formatFactValue } from "@/lib/knowledge-bank-view";

type Gate1FinancialTableProps = {
  rows: FinancialTableRow[];
  saving: boolean;
  onSave: (factKey: string, value: string) => Promise<void>;
};

function EditableCell({
  factKey,
  value,
  unit,
  saving,
  onSave,
}: {
  factKey: string | undefined;
  value: unknown;
  unit: string | null;
  saving: boolean;
  onSave: (factKey: string, value: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ""));

  if (!factKey) {
    return <span className="text-secondary">—</span>;
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="w-full min-w-[4rem] rounded border border-brand-border px-2 py-1 text-xs"
        />
        <div className="flex gap-2">
          <button
            type="button"
            className="text-xs font-semibold text-brand-primary"
            disabled={saving}
            onClick={() => void onSave(factKey, draft).then(() => setEditing(false))}
          >
            {GATE1_LABEL.FACT_SAVE}
          </button>
          <button
            type="button"
            className="text-xs text-secondary"
            onClick={() => {
              setDraft(String(value ?? ""));
              setEditing(false);
            }}
          >
            {GATE1_LABEL.FACT_CANCEL}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="text-left text-sm font-medium text-brand-text-primary hover:underline"
      onClick={() => {
        setDraft(String(value ?? ""));
        setEditing(true);
      }}
    >
      {formatFactValue(value, unit)}
    </button>
  );
}

export function Gate1FinancialTable({ rows, saving, onSave }: Gate1FinancialTableProps) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-brand-border text-left text-xs font-bold uppercase tracking-wide text-brand-neutral">
            <th className="py-2 pr-3">Output line</th>
            <th className="py-2 pr-3">Budget</th>
            <th className="py-2 pr-3">Actual</th>
            <th className="py-2">Currency</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.rowId} className="border-b border-brand-border/60 align-top">
              <td className="py-2 pr-3 font-medium text-brand-text-primary">{row.label}</td>
              <td className="py-2 pr-3">
                <EditableCell
                  factKey={row.budget?.key}
                  value={row.budget?.value}
                  unit={row.budget?.unit ?? row.currency}
                  saving={saving}
                  onSave={onSave}
                />
              </td>
              <td className="py-2 pr-3">
                <EditableCell
                  factKey={row.actual?.key}
                  value={row.actual?.value}
                  unit={row.actual?.unit ?? row.currency}
                  saving={saving}
                  onSave={onSave}
                />
              </td>
              <td className="py-2 text-secondary">{row.currency ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
