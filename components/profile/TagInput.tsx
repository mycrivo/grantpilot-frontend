"use client";

import { KeyboardEvent, useState } from "react";

type TagInputProps = {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  helperText?: string;
};

function normalizeTag(raw: string) {
  return raw.trim().replace(/\s+/g, " ");
}

export function TagInput({ label, value, onChange, placeholder, helperText }: TagInputProps) {
  const [draft, setDraft] = useState("");

  const pushTag = (candidate: string) => {
    const normalized = normalizeTag(candidate);
    if (!normalized) {
      return;
    }

    const exists = value.some((tag) => tag.toLowerCase() === normalized.toLowerCase());
    if (exists) {
      setDraft("");
      return;
    }

    onChange([...value, normalized]);
    setDraft("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      pushTag(draft);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-brand-text-primary">{label}</label>
      {helperText ? <p className="text-secondary">{helperText}</p> : null}
      <div className="rounded-[8px] border border-brand-border bg-brand-card-bg p-2">
        <div className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-2 rounded-full border border-brand-border bg-brand-divider px-3 py-1 text-sm text-brand-text-primary"
            >
              {tag}
              <button
                type="button"
                className="text-brand-text-secondary hover:text-brand-text-primary"
                aria-label={`Remove ${tag}`}
                onClick={() => onChange(value.filter((item) => item !== tag))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder ?? "Type and press Enter"}
            className="h-11 w-full rounded-[8px] border border-brand-border bg-brand-card-bg px-3 text-[14px] outline-none focus:border-brand-primary"
          />
          <button
            type="button"
            className="h-11 rounded-[8px] border border-brand-border px-4 text-sm font-semibold text-brand-text-primary"
            onClick={() => pushTag(draft)}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
