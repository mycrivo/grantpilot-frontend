type JourneyStepKey = "upload" | "read" | "facts" | "questions" | "review" | "download";

const JOURNEY_STEPS: { key: JourneyStepKey; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "read", label: "Read" },
  { key: "facts", label: "Facts" },
  { key: "questions", label: "Questions" },
  { key: "review", label: "Review" },
  { key: "download", label: "Download" },
];

type ReportsJourneyStepsProps = {
  current: JourneyStepKey;
};

function stepIndex(key: JourneyStepKey): number {
  return JOURNEY_STEPS.findIndex((step) => step.key === key);
}

export function ReportsJourneySteps({ current }: ReportsJourneyStepsProps) {
  const currentIndex = stepIndex(current);

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-secondary" role="list" aria-label="Report progress">
      {JOURNEY_STEPS.map((step, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div key={step.key} className="flex items-center gap-2" role="listitem">
            <span
              className={[
                "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                isDone ? "bg-brand-success text-white" : "",
                isCurrent ? "bg-brand-primary text-white" : "",
                !isDone && !isCurrent ? "border border-brand-border text-secondary" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {isDone ? "✓" : index + 1}
            </span>
            <span className={isCurrent || isDone ? "font-semibold text-brand-text-primary" : ""}>{step.label}</span>
            {index < JOURNEY_STEPS.length - 1 ? <span className="hidden text-brand-border sm:inline">—</span> : null}
          </div>
        );
      })}
    </div>
  );
}
