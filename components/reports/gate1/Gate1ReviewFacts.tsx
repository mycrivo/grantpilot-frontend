"use client";

import { useMemo, useState } from "react";

import { Gate1AddFactForm } from "@/components/reports/gate1/Gate1AddFactForm";
import { Gate1ClientConflictPanel } from "@/components/reports/gate1/Gate1ClientConflictPanel";
import { Gate1ConflictPanel } from "@/components/reports/gate1/Gate1ConflictPanel";
import { Gate1DegradedBanner } from "@/components/reports/gate1/Gate1DegradedBanner";
import { Gate1ReviewClusterCard } from "@/components/reports/gate1/Gate1ReviewCluster";
import { Gate1StickyFooter } from "@/components/reports/gate1/Gate1StickyFooter";
import { Gate1UnreadableSourcesPanel } from "@/components/reports/gate1/Gate1UnreadableSourcesPanel";
import { GATE1_LABEL } from "@/components/reports/report-status-labels";
import type { KnowledgeBankResponse } from "@/lib/api/reports";
import {
  buildGate1LayoutView,
  buildGate1ReviewClusters,
  type Gate1ReviewClusterId,
} from "@/lib/knowledge-bank-gate1-layout";

type Gate1ReviewFactsProps = {
  knowledgeBank: KnowledgeBankResponse;
  saving: boolean;
  confirming: boolean;
  confirmError: string | null;
  saveError?: string | null;
  onDismissSaveError?: () => void;
  reviewedClusterIds: Set<Gate1ReviewClusterId>;
  reviewingClusterId: Gate1ReviewClusterId | null;
  onSaveFact: (factKey: string, value: string) => Promise<void>;
  onResolveConflict: (factKey: string, resolvedValue: unknown) => Promise<void>;
  onResolveClientConflict: (factKeys: string[], resolvedValue: string) => Promise<void>;
  onAddFact: (label: string, value: string, sourceLabel: string) => Promise<void>;
  onClusterReview: (clusterId: Gate1ReviewClusterId) => Promise<void>;
  onContinue: () => Promise<void>;
};

export function Gate1ReviewFacts({
  knowledgeBank,
  saving,
  confirming,
  confirmError,
  saveError,
  onDismissSaveError,
  reviewedClusterIds,
  reviewingClusterId,
  onSaveFact,
  onResolveConflict,
  onResolveClientConflict,
  onAddFact,
  onClusterReview,
  onContinue,
}: Gate1ReviewFactsProps) {
  const [resolvedClientConflictIds, setResolvedClientConflictIds] = useState<Set<string>>(new Set());

  const layout = useMemo(() => buildGate1LayoutView(knowledgeBank), [knowledgeBank]);
  const clusters = useMemo(() => buildGate1ReviewClusters(layout), [layout]);

  const unresolvedClientConflicts = layout.clientPromotedConflicts.filter(
    (conflict) => !resolvedClientConflictIds.has(conflict.id),
  );

  const unresolvedCount = layout.unresolvedConflicts.length + unresolvedClientConflicts.length;
  const hasUnresolvedConflicts = unresolvedCount > 0;
  const allClustersReviewed =
    clusters.length > 0 && clusters.every((cluster) => reviewedClusterIds.has(cluster.clusterId));

  const handleClientConflictResolve = async (factKeys: string[], resolvedValue: string) => {
    const conflict = layout.clientPromotedConflicts.find((entry) =>
      entry.values.some((value) => factKeys.includes(value.factKey)),
    );
    await onResolveClientConflict(factKeys, resolvedValue);
    if (conflict) {
      setResolvedClientConflictIds((current) => new Set([...current, conflict.id]));
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-28">
      <header>
        <h1 className="text-[28px] font-bold leading-tight text-brand-text-primary">{GATE1_LABEL.TITLE}</h1>
        <p className="mt-2 text-[15px] text-secondary">{GATE1_LABEL.SUBTITLE}</p>
      </header>

      {layout.isDegraded ? (
        <Gate1DegradedBanner rawFactCount={layout.rawFactCount} displayFactCount={layout.displayFactCount} />
      ) : null}

      <Gate1UnreadableSourcesPanel sources={layout.unreadableSources} />

      {saveError ? (
        <div
          className="flex items-start justify-between gap-3 rounded-[8px] border border-brand-error/30 bg-brand-error/5 px-3 py-2 text-sm text-brand-error"
          role="alert"
        >
          <p>{saveError}</p>
          {onDismissSaveError ? (
            <button
              type="button"
              className="shrink-0 font-semibold underline"
              onClick={onDismissSaveError}
            >
              Dismiss
            </button>
          ) : null}
        </div>
      ) : null}

      {unresolvedCount > 0 ? (
        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-warning">
            {GATE1_LABEL.NEEDS_DECISION} ({unresolvedCount})
          </p>
          {layout.unresolvedConflicts.map((conflict) => (
            <Gate1ConflictPanel
              key={conflict.factKey}
              conflict={conflict}
              saving={saving}
              onResolve={onResolveConflict}
            />
          ))}
          {unresolvedClientConflicts.map((conflict) => (
            <Gate1ClientConflictPanel
              key={conflict.id}
              conflict={conflict}
              saving={saving}
              onResolve={handleClientConflictResolve}
            />
          ))}
        </div>
      ) : null}

      <div className="space-y-4">
        {clusters.map((cluster) => (
          <Gate1ReviewClusterCard
            key={cluster.clusterId}
            cluster={cluster}
            layout={layout}
            saving={saving}
            reviewing={reviewingClusterId === cluster.clusterId}
            reviewed={reviewedClusterIds.has(cluster.clusterId)}
            onReview={onClusterReview}
            onSaveFact={onSaveFact}
          />
        ))}
      </div>

      <p className="flex items-start gap-2 rounded-[6px] border border-brand-border bg-brand-primary/5 px-4 py-3 text-sm text-secondary">
        <span aria-hidden="true" className="text-brand-primary">
          ⛨
        </span>
        <span>{GATE1_LABEL.TRUST_LINE}</span>
      </p>

      <Gate1StickyFooter
        confirming={confirming}
        saving={saving}
        disabled={hasUnresolvedConflicts || !allClustersReviewed}
        unresolvedCount={unresolvedCount}
        confirmError={confirmError}
        continueLabel={GATE1_LABEL.CONTINUE_TO_QUESTIONS}
        continueHint={
          !allClustersReviewed && !hasUnresolvedConflicts ? GATE1_LABEL.CONTINUE_TO_QUESTIONS_HINT : null
        }
        onContinue={onContinue}
      >
        <Gate1AddFactForm saving={saving} onAdd={onAddFact} />
      </Gate1StickyFooter>
    </div>
  );
}
