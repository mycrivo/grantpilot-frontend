"use client";

type UsageBarProps = {
  label: string;
  used: number;
  limit: number;
};

function toPercent(used: number, limit: number) {
  if (limit <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round((used / limit) * 100)));
}

export function UsageBar({ label, used, limit }: UsageBarProps) {
  const percent = toPercent(used, limit);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-brand-text-primary">{label}</p>
        <p className="text-sm text-secondary">
          {used}/{limit} used
        </p>
      </div>
      <div className="h-2 rounded-full bg-brand-divider">
        <div className="h-2 rounded-full bg-brand-primary" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
