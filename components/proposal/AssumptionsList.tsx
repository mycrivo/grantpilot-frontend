"use client";

type AssumptionsListProps = {
  title: string;
  items: string[];
};

export function AssumptionsList({ title, items }: AssumptionsListProps) {
  if (!items.length) {
    return null;
  }

  return (
    <details className="rounded-[8px] border border-brand-border bg-brand-card-bg p-3">
      <summary className="cursor-pointer text-sm font-semibold text-brand-text-primary">{title}</summary>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-secondary">
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ul>
    </details>
  );
}
