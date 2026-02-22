import type { NgoProfileCompleteness } from "@/lib/api/ngoProfile";

type CompletenessBarProps = {
  completeness: NgoProfileCompleteness | null;
};

export function CompletenessBar({ completeness }: CompletenessBarProps) {
  const percent = Math.max(0, Math.min(100, completeness?.percent_complete ?? 0));
  const missing = completeness?.missing_fields ?? [];
  const isComplete = completeness?.status === "COMPLETE";

  return (
    <div className="sticky top-4 z-10">
      <div className={`card ${isComplete ? "border-brand-success/30 bg-brand-success/5" : ""}`}>
        <div className="flex items-center justify-between gap-3">
          <h4>{isComplete ? "Profile complete — you can now run Fit Scans" : `Your profile is ${percent}% complete`}</h4>
          <span className="text-sm font-semibold text-brand-text-primary">{percent}%</span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-brand-divider">
          <div
            className={`h-2 rounded-full ${isComplete ? "bg-brand-success" : "bg-brand-primary"}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        {!isComplete && missing.length > 0 ? (
          <div className="mt-3">
            <p className="text-secondary">Missing required fields:</p>
            <p className="mt-1 text-sm text-brand-text-primary">{missing.join(", ")}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
