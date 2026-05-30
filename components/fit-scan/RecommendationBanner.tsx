import {
  type FitScanRecommendation,
  isKnownRecommendation,
  recommendationLabel,
} from "@/lib/fit-scan-labels";

type RecommendationBannerProps = {
  recommendation: FitScanRecommendation | string;
  rationale: string;
};

const recommendationStyles: Record<FitScanRecommendation, { className: string }> = {
  RECOMMENDED: {
    className: "border-brand-success/30 bg-brand-success/10 text-brand-success",
  },
  APPLY_WITH_CAVEATS: {
    className: "border-brand-warning/30 bg-brand-warning/10 text-brand-warning",
  },
  NOT_RECOMMENDED: {
    className: "border-brand-error/25 bg-brand-error/5 text-brand-error",
  },
};

const neutralStyle = "border-brand-border bg-brand-neutral/10 text-brand-neutral";

export function RecommendationBanner({ recommendation, rationale }: RecommendationBannerProps) {
  const style = isKnownRecommendation(recommendation)
    ? recommendationStyles[recommendation.trim().toUpperCase() as FitScanRecommendation]
    : { className: neutralStyle };

  return (
    <div className={`card border ${style.className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-brand-card-bg px-3 py-1 text-sm font-semibold">
          {recommendationLabel(recommendation)}
        </span>
      </div>
      <p className="mt-3 text-brand-text-primary">{rationale}</p>
    </div>
  );
}
