"use client";

import { Gate1FactGridRow } from "@/components/reports/gate1/Gate1FactGridRow";
import { Gate1FinancialTable } from "@/components/reports/gate1/Gate1FinancialTable";
import { Gate1IndicatorTable } from "@/components/reports/gate1/Gate1IndicatorTable";
import { Gate1Section } from "@/components/reports/gate1/Gate1Section";
import { GATE1_LABEL } from "@/components/reports/report-status-labels";
import type {
  Gate1LayoutView,
  Gate1ReviewCluster,
  Gate1ReviewClusterId,
} from "@/lib/knowledge-bank-gate1-layout";

type Gate1ReviewClusterProps = {
  cluster: Gate1ReviewCluster;
  layout: Gate1LayoutView;
  saving: boolean;
  reviewing: boolean;
  reviewed: boolean;
  onReview: (clusterId: Gate1ReviewClusterId) => Promise<void>;
  onSaveFact: (factKey: string, value: string) => Promise<void>;
};

export function Gate1ReviewClusterCard({
  cluster,
  layout,
  saving,
  reviewing,
  reviewed,
  onReview,
  onSaveFact,
}: Gate1ReviewClusterProps) {
  const { sections } = layout;

  const renderClusterBody = () => {
    switch (cluster.clusterId) {
      case "programme_summary":
        return sections.programmeSummary.map((fact) => (
          <Gate1FactGridRow key={fact.key} fact={fact} saving={saving} onSave={onSaveFact} />
        ));
      case "indicators":
        return (
          <>
            {sections.indicatorTable.length > 0 ? (
              <Gate1IndicatorTable rows={sections.indicatorTable} saving={saving} onSave={onSaveFact} />
            ) : null}
            {sections.indicators.map((fact) => (
              <Gate1FactGridRow key={fact.key} fact={fact} saving={saving} compact onSave={onSaveFact} />
            ))}
          </>
        );
      case "financials":
        return (
          <>
            {sections.financialTable.length > 0 ? (
              <Gate1FinancialTable rows={sections.financialTable} saving={saving} onSave={onSaveFact} />
            ) : null}
            {sections.financials.map((fact) => (
              <Gate1FactGridRow key={fact.key} fact={fact} saving={saving} compact onSave={onSaveFact} />
            ))}
          </>
        );
      case "objectives_and_reporting":
        return (
          <>
            {sections.objectives.length > 0 ? (
              <Gate1Section title={GATE1_LABEL.SECTION_OBJECTIVES} count={sections.objectives.length}>
                {sections.objectives.map((fact) => (
                  <Gate1FactGridRow key={fact.key} fact={fact} saving={saving} compact onSave={onSaveFact} />
                ))}
              </Gate1Section>
            ) : null}
            {sections.reporting.length > 0 ? (
              <Gate1Section title={GATE1_LABEL.SECTION_REPORTING} count={sections.reporting.length}>
                {sections.reporting.map((fact) => (
                  <Gate1FactGridRow key={fact.key} fact={fact} saving={saving} compact onSave={onSaveFact} />
                ))}
              </Gate1Section>
            ) : null}
          </>
        );
      case "other":
        return sections.other.map((fact) => (
          <Gate1FactGridRow key={fact.key} fact={fact} saving={saving} compact onSave={onSaveFact} />
        ));
      default:
        return null;
    }
  };

  return (
    <section
      className={[
        "rounded-[12px] border bg-brand-card-bg px-4 py-4",
        cluster.hasUnverified && !reviewed ? "border-brand-warning/60" : "border-brand-border",
      ].join(" ")}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-brand-text-primary">{cluster.title}</h2>
          <p className="mt-1 text-sm text-secondary">{cluster.description}</p>
          <p className="mt-1 text-xs text-secondary">{GATE1_LABEL.ROWS(cluster.factCount)}</p>
          {cluster.hasUnverified ? (
            <p className="mt-2 text-xs font-medium text-brand-warning">{GATE1_LABEL.CLUSTER_NEEDS_PROMOTION}</p>
          ) : null}
        </div>
        {reviewed ? (
          <span className="rounded-full border border-brand-primary/30 bg-brand-primary/5 px-3 py-1 text-xs font-semibold text-brand-primary">
            {GATE1_LABEL.CLUSTER_REVIEWED}
          </span>
        ) : (
          <button
            type="button"
            className="btn-secondary text-sm disabled:cursor-not-allowed disabled:opacity-60"
            disabled={saving || reviewing}
            onClick={() => void onReview(cluster.clusterId)}
          >
            {reviewing ? GATE1_LABEL.CLUSTER_REVIEWING : GATE1_LABEL.CLUSTER_REVIEW_CTA}
          </button>
        )}
      </div>
      <div>{renderClusterBody()}</div>
    </section>
  );
}
