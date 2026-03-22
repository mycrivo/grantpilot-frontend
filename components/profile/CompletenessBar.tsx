import type { ProfileCompleteness as NgoProfileCompleteness } from "@/lib/profile-types";

type CompletenessBarProps = {
  completeness: NgoProfileCompleteness | null;
};

export function CompletenessBar({ completeness }: CompletenessBarProps) {
  if (!completeness) {
    return (
      <div className="sticky top-4 z-10">
        <div className="card border-brand-border/60 bg-brand-card-bg">
          <h4>Profile completeness unavailable</h4>
          <p className="mt-2 text-secondary">Unable to load completeness right now.</p>
        </div>
      </div>
    );
  }

  const percent = Math.max(0, Math.min(100, completeness?.completeness_score ?? 0));
  const isComplete = completeness?.profile_status === "COMPLETE";

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
      </div>
    </div>
  );
}
