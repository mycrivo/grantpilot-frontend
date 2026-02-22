type Recommendation = "RECOMMENDED" | "APPLY_WITH_CAVEATS" | "NOT_RECOMMENDED";

type RecommendationBannerProps = {
  recommendation: Recommendation;
  rationale: string;
  modelRating?: string;
};

const recommendationStyles: Record<Recommendation, { title: string; className: string }> = {
  RECOMMENDED: {
    title: "RECOMMENDED",
    className: "border-brand-success/30 bg-brand-success/10 text-brand-success",
  },
  APPLY_WITH_CAVEATS: {
    title: "APPLY_WITH_CAVEATS",
    className: "border-brand-warning/30 bg-brand-warning/10 text-brand-warning",
  },
  NOT_RECOMMENDED: {
    title: "NOT_RECOMMENDED",
    className: "border-brand-error/25 bg-brand-error/5 text-brand-error",
  },
};

export function RecommendationBanner({
  recommendation,
  rationale,
  modelRating,
}: RecommendationBannerProps) {
  const style = recommendationStyles[recommendation];

  return (
    <div className={`card border ${style.className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-brand-card-bg px-3 py-1 text-sm font-semibold">
          {style.title}
        </span>
        {modelRating ? (
          <span className="rounded-full border border-brand-border bg-brand-card-bg px-3 py-1 text-xs font-medium text-brand-text-primary">
            {modelRating}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-brand-text-primary">{rationale}</p>
    </div>
  );
}
