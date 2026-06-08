"use client";

import { useState, type ReactNode } from "react";

type Gate1SectionProps = {
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function Gate1Section({ title, count, defaultOpen = false, children }: Gate1SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (count === 0) {
    return null;
  }

  return (
    <section className="rounded-[12px] border border-brand-border bg-brand-card-bg">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="font-semibold text-brand-text-primary">{title}</span>
        <span className="text-xs font-semibold text-secondary">
          {count} {count === 1 ? "item" : "items"} {open ? "▾" : "▸"}
        </span>
      </button>
      {open ? <div className="border-t border-brand-border px-4 py-3">{children}</div> : null}
    </section>
  );
}
