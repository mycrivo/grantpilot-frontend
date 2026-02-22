type ScoreBarProps = {
  label: string;
  score: number;
};

function barColor(score: number) {
  if (score >= 70) {
    return "bg-brand-success";
  }
  if (score >= 40) {
    return "bg-brand-warning";
  }
  return "bg-brand-error";
}

export function ScoreBar({ label, score }: ScoreBarProps) {
  const clamped = Math.max(0, Math.min(100, score));

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-brand-text-primary">{label}</span>
        <span className="text-sm font-semibold text-brand-text-primary">{clamped}</span>
      </div>
      <div className="h-2 rounded-full bg-brand-divider">
        <div className={`h-2 rounded-full ${barColor(clamped)}`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
