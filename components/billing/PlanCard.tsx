"use client";

type PlanCardProps = {
  title: string;
  price: string;
  fitScans: string;
  proposals: string;
  regenerations: string;
  buttonLabel: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
};

export function PlanCard({
  title,
  price,
  fitScans,
  proposals,
  regenerations,
  buttonLabel,
  loading,
  disabled,
  onClick,
}: PlanCardProps) {
  return (
    <div className="rounded-[8px] border border-brand-border p-4">
      <div className="space-y-1">
        <h4>{title}</h4>
        <p className="text-sm text-secondary">{price}</p>
      </div>
      <ul className="mt-4 space-y-2 text-sm text-secondary">
        <li>Fit Scans: {fitScans}</li>
        <li>Proposals: {proposals}</li>
        <li>Regenerations: {regenerations}</li>
      </ul>
      <button
        type="button"
        className="btn-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-60"
        onClick={onClick}
        disabled={disabled}
      >
        {loading ? "Redirecting..." : buttonLabel}
      </button>
    </div>
  );
}
