type RiskSeverity = "HIGH" | "MEDIUM" | "LOW";

type RiskFlag = {
  risk_type: string;
  severity: RiskSeverity;
  description: string;
};

type RiskFlagListProps = {
  riskFlags: RiskFlag[];
};

const severityStyles: Record<RiskSeverity, { icon: string; className: string }> = {
  HIGH: { icon: "!", className: "text-brand-error" },
  MEDIUM: { icon: "!", className: "text-brand-warning" },
  LOW: { icon: "i", className: "text-brand-neutral" },
};

export function RiskFlagList({ riskFlags }: RiskFlagListProps) {
  if (riskFlags.length === 0) {
    return (
      <div className="card">
        <h4>Risk flags</h4>
        <p className="mt-2 text-secondary">No risk flags were reported for this Fit Scan.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h4>Risk flags</h4>
      <ul className="mt-3 space-y-3">
        {riskFlags.map((flag, index) => {
          const style = severityStyles[flag.severity];
          return (
            <li key={`${flag.risk_type}-${index}`} className="rounded-[8px] border border-brand-border p-3">
              <div className="flex items-center gap-2">
                <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border border-current text-xs font-bold ${style.className}`}>
                  {style.icon}
                </span>
                <p className="text-sm font-semibold text-brand-text-primary">
                  {flag.risk_type} ({flag.severity})
                </p>
              </div>
              <p className="mt-1 text-secondary">{flag.description}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
