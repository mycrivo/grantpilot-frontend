import { GATE1_LABEL } from "@/components/reports/report-status-labels";
import type { NormalizedUnreadableSource } from "@/lib/knowledge-bank-view";

type Gate1UnreadableSourcesPanelProps = {
  sources: NormalizedUnreadableSource[];
};

export function Gate1UnreadableSourcesPanel({ sources }: Gate1UnreadableSourcesPanelProps) {
  if (sources.length === 0) {
    return null;
  }

  return (
    <div className="rounded-[12px] border border-brand-warning/30 bg-brand-warning/5 p-4">
      <h2 className="font-semibold text-brand-text-primary">{GATE1_LABEL.UNREADABLE_HEADING}</h2>
      <p className="mt-2 text-sm text-secondary">{GATE1_LABEL.UNREADABLE_SUBHEADING}</p>
      <ul className="mt-4 space-y-2">
        {sources.map((source) => (
          <li
            key={source.sourceDocumentId}
            className="rounded-[8px] border border-brand-warning/20 bg-brand-card-bg px-3 py-2 text-sm"
          >
            <p className="font-semibold text-brand-text-primary">{source.sourceLabel}</p>
            <p className="mt-1 text-secondary">{source.explanation}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-secondary">{GATE1_LABEL.UNREADABLE_TRUST_LINE}</p>
    </div>
  );
}
