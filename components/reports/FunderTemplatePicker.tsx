"use client";

import { useMemo, useState } from "react";

import type { ReportTemplateItem } from "@/lib/api/reports";

type FunderTemplatePickerProps = {
  templates: ReportTemplateItem[];
  selectedId: string | null;
  onSelect: (template: ReportTemplateItem) => void;
};

export function FunderTemplatePicker({ templates, selectedId, onSelect }: FunderTemplatePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = templates.find((item) => item.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return templates;
    }
    return templates.filter(
      (item) =>
        item.funder_name.toLowerCase().includes(normalized) ||
        item.template_name.toLowerCase().includes(normalized) ||
        item.region.toLowerCase().includes(normalized),
    );
  }, [query, templates]);

  return (
    <div className="relative">
      <label htmlFor="funder-template-trigger" className="mb-2 block text-sm font-semibold text-brand-text-primary">
        Funder
      </label>
      <button
        id="funder-template-trigger"
        type="button"
        className="flex w-full items-center justify-between rounded-[8px] border border-brand-border bg-brand-card-bg px-4 py-3 text-left"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {selected ? (
          <span>
            <span className="block font-semibold text-brand-text-primary">{selected.funder_name}</span>
            <span className="block text-sm text-secondary">
              {selected.region} · Template ready
            </span>
          </span>
        ) : (
          <span className="text-secondary">Choose a funder template…</span>
        )}
        <span aria-hidden="true" className="text-secondary">
          ▾
        </span>
      </button>
      <p className="mt-2 text-sm text-secondary">Only funders we can format for appear here. More are added over time.</p>

      {open ? (
        <div className="absolute z-20 mt-2 w-full rounded-[12px] border border-brand-border bg-brand-card-bg shadow-md">
          <div className="border-b border-brand-divider p-3">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search funders…"
              className="w-full rounded-[8px] border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-primary"
              aria-label="Search funders"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1" role="listbox" aria-label="Funders">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-secondary">No funders match your search.</li>
            ) : (
              filtered.map((template) => (
                <li key={template.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={template.id === selectedId}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-brand-divider"
                    onClick={() => {
                      onSelect(template);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <span className="mt-1 text-brand-primary" aria-hidden="true">
                      {template.id === selectedId ? "✓" : ""}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-brand-text-primary">
                        {template.funder_name} <span className="font-normal text-secondary">{template.region}</span>
                      </span>
                      <span className="block text-sm text-secondary">{template.template_name}</span>
                    </span>
                    <span className="shrink-0 rounded-full border border-brand-border px-2 py-0.5 text-xs font-semibold text-brand-primary">
                      Template ready
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}

      {selected ? (
        <div className="mt-4 flex items-start gap-3 rounded-[8px] border border-brand-border bg-brand-primary/5 p-4">
          <span className="text-brand-primary" aria-hidden="true">
            ⓘ
          </span>
          <div>
            <p className="font-semibold text-brand-text-primary">{selected.template_name}</p>
            <p className="mt-1 text-sm text-secondary">
              Reporting frequency: {selected.reporting_frequency.replaceAll("_", " ")}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
