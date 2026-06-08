"use client";

import { Gate1AddFactForm } from "@/components/reports/gate1/Gate1AddFactForm";
import { Gate1ConflictPanel } from "@/components/reports/gate1/Gate1ConflictPanel";
import { Gate1FactRow } from "@/components/reports/gate1/Gate1FactRow";
import { Gate1UnreadableSourcesPanel } from "@/components/reports/gate1/Gate1UnreadableSourcesPanel";
import { GATE1_LABEL } from "@/components/reports/report-status-labels";
import type { KnowledgeBankResponse } from "@/lib/api/reports";
import { buildKnowledgeBankView } from "@/lib/knowledge-bank-view";

type Gate1ReviewFactsProps = {
  knowledgeBank: KnowledgeBankResponse;
  saving: boolean;
  confirming: boolean;
  confirmError: string | null;
  onSaveFact: (factKey: string, value: string) => Promise<void>;
  onResolveConflict: (factKey: string, resolvedValue: unknown) => Promise<void>;
  onAddFact: (label: string, value: string, sourceLabel: string) => Promise<void>;
  onConfirm: () => Promise<void>;
};

export function Gate1ReviewFacts({
  knowledgeBank,
  saving,
  confirming,
  confirmError,
  onSaveFact,
  onResolveConflict,
  onAddFact,
  onConfirm,
}: Gate1ReviewFactsProps) {
  const view = buildKnowledgeBankView(knowledgeBank);
  const hasUnresolvedConflicts = view.unresolvedConflicts.length > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-[28px] font-bold leading-tight text-brand-text-primary">{GATE1_LABEL.TITLE}</h1>
        <p className="mt-2 text-[15px] text-secondary">{GATE1_LABEL.SUBTITLE}</p>
      </header>

      <Gate1UnreadableSourcesPanel sources={view.unreadableSources} />

      {view.unresolvedConflicts.map((conflict) => (
        <Gate1ConflictPanel
          key={conflict.factKey}
          conflict={conflict}
          saving={saving}
          onResolve={onResolveConflict}
        />
      ))}

      {view.facts.length > 0 ? (
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-neutral">
            {GATE1_LABEL.CONFIRMED_FACTS}
          </p>
          <ul className="space-y-2">
            {view.facts.map((fact) => (
              <li key={fact.key}>
                <Gate1FactRow fact={fact} saving={saving} onSave={onSaveFact} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="flex items-start gap-2 rounded-[6px] border border-brand-border bg-brand-primary/5 px-4 py-3 text-sm text-secondary">
        <span aria-hidden="true" className="text-brand-primary">
          ⛨
        </span>
        <span>{GATE1_LABEL.TRUST_LINE}</span>
      </p>

      {confirmError ? (
        <p className="rounded-[8px] border border-brand-error/30 bg-brand-error/5 px-4 py-3 text-sm text-brand-error">
          {confirmError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          disabled={confirming || saving || hasUnresolvedConflicts}
          onClick={() => void onConfirm()}
        >
          {confirming ? GATE1_LABEL.CONFIRMING : GATE1_LABEL.CONFIRM_FACTS}
        </button>
        <Gate1AddFactForm saving={saving} onAdd={onAddFact} />
      </div>
    </div>
  );
}
