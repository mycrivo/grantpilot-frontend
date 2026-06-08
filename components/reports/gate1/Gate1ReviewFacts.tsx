"use client";

import { useMemo, useState } from "react";

import { Gate1AddFactForm } from "@/components/reports/gate1/Gate1AddFactForm";
import { Gate1ClientConflictPanel } from "@/components/reports/gate1/Gate1ClientConflictPanel";
import { Gate1ConflictPanel } from "@/components/reports/gate1/Gate1ConflictPanel";
import { Gate1DegradedBanner } from "@/components/reports/gate1/Gate1DegradedBanner";
import { Gate1FactGridRow } from "@/components/reports/gate1/Gate1FactGridRow";
import { Gate1FinancialTable } from "@/components/reports/gate1/Gate1FinancialTable";
import { Gate1IndicatorTable } from "@/components/reports/gate1/Gate1IndicatorTable";
import { Gate1Section } from "@/components/reports/gate1/Gate1Section";
import { Gate1StickyFooter } from "@/components/reports/gate1/Gate1StickyFooter";
import { Gate1UnreadableSourcesPanel } from "@/components/reports/gate1/Gate1UnreadableSourcesPanel";
import { GATE1_LABEL } from "@/components/reports/report-status-labels";
import type { KnowledgeBankResponse } from "@/lib/api/reports";
import { buildGate1LayoutView } from "@/lib/knowledge-bank-gate1-layout";

type Gate1ReviewFactsProps = {
  knowledgeBank: KnowledgeBankResponse;
  saving: boolean;
  confirming: boolean;
  confirmError: string | null;
  onSaveFact: (factKey: string, value: string) => Promise<void>;
  onResolveConflict: (factKey: string, resolvedValue: unknown) => Promise<void>;
  onResolveClientConflict: (factKeys: string[], resolvedValue: string) => Promise<void>;
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
  onResolveClientConflict,
  onAddFact,
  onConfirm,
}: Gate1ReviewFactsProps) {
  const [resolvedClientConflictIds, setResolvedClientConflictIds] = useState<Set<string>>(new Set());
  const [otherSearch, setOtherSearch] = useState("");

  const layout = useMemo(() => buildGate1LayoutView(knowledgeBank), [knowledgeBank]);

  const unresolvedClientConflicts = layout.clientPromotedConflicts.filter(
    (conflict) => !resolvedClientConflictIds.has(conflict.id),
  );

  const unresolvedCount = layout.unresolvedConflicts.length + unresolvedClientConflicts.length;
  const hasUnresolvedConflicts = unresolvedCount > 0;

  const handleClientConflictResolve = async (factKeys: string[], resolvedValue: string) => {
    const conflict = layout.clientPromotedConflicts.find((entry) =>
      entry.values.some((value) => factKeys.includes(value.factKey)),
    );
    await onResolveClientConflict(factKeys, resolvedValue);
    if (conflict) {
      setResolvedClientConflictIds((current) => new Set([...current, conflict.id]));
    }
  };

  const filteredOther = layout.sections.other.filter((fact) => {
    if (!otherSearch.trim()) {
      return true;
    }
    const needle = otherSearch.trim().toLowerCase();
    return fact.label.toLowerCase().includes(needle) || String(fact.value ?? "").toLowerCase().includes(needle);
  });

  const showOtherSearch = layout.rawFactCount > 30 && layout.sections.other.length > 0;

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

      {layout.sections.programmeSummary.length > 0 ? (
        <section className="rounded-[12px] border border-brand-border bg-brand-card-bg px-4 py-3">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-neutral">
            {GATE1_LABEL.SECTION_PROGRAMME}
          </h2>
          <div>
            {layout.sections.programmeSummary.map((fact) => (
              <Gate1FactGridRow key={fact.key} fact={fact} saving={saving} onSave={onSaveFact} />
            ))}
          </div>
        </section>
      ) : null}

      {layout.sections.indicatorTable.length > 0 ? (
        <Gate1Section
          title={GATE1_LABEL.SECTION_INDICATORS}
          count={layout.sections.indicatorTable.length}
          defaultOpen={false}
        >
          <Gate1IndicatorTable rows={layout.sections.indicatorTable} saving={saving} onSave={onSaveFact} />
          {layout.sections.indicators.length > 0 ? (
            <div className="mt-4 border-t border-brand-border pt-3">
              {layout.sections.indicators.map((fact) => (
                <Gate1FactGridRow key={fact.key} fact={fact} saving={saving} compact onSave={onSaveFact} />
              ))}
            </div>
          ) : null}
        </Gate1Section>
      ) : layout.sections.indicators.length > 0 ? (
        <Gate1Section title={GATE1_LABEL.SECTION_INDICATORS} count={layout.sections.indicators.length}>
          {layout.sections.indicators.map((fact) => (
            <Gate1FactGridRow key={fact.key} fact={fact} saving={saving} compact onSave={onSaveFact} />
          ))}
        </Gate1Section>
      ) : null}

      {layout.sections.financialTable.length > 0 ? (
        <Gate1Section
          title={GATE1_LABEL.SECTION_FINANCIALS}
          count={layout.sections.financialTable.length}
          defaultOpen={false}
        >
          <Gate1FinancialTable rows={layout.sections.financialTable} saving={saving} onSave={onSaveFact} />
          {layout.sections.financials.length > 0 ? (
            <div className="mt-4 border-t border-brand-border pt-3">
              {layout.sections.financials.map((fact) => (
                <Gate1FactGridRow key={fact.key} fact={fact} saving={saving} compact onSave={onSaveFact} />
              ))}
            </div>
          ) : null}
        </Gate1Section>
      ) : layout.sections.financials.length > 0 ? (
        <Gate1Section title={GATE1_LABEL.SECTION_FINANCIALS} count={layout.sections.financials.length}>
          {layout.sections.financials.map((fact) => (
            <Gate1FactGridRow key={fact.key} fact={fact} saving={saving} compact onSave={onSaveFact} />
          ))}
        </Gate1Section>
      ) : null}

      {layout.sections.objectives.length > 0 ? (
        <Gate1Section title={GATE1_LABEL.SECTION_OBJECTIVES} count={layout.sections.objectives.length}>
          {layout.sections.objectives.map((fact) => (
            <Gate1FactGridRow key={fact.key} fact={fact} saving={saving} compact onSave={onSaveFact} />
          ))}
        </Gate1Section>
      ) : null}

      {layout.sections.reporting.length > 0 ? (
        <Gate1Section title={GATE1_LABEL.SECTION_REPORTING} count={layout.sections.reporting.length}>
          {layout.sections.reporting.map((fact) => (
            <Gate1FactGridRow key={fact.key} fact={fact} saving={saving} compact onSave={onSaveFact} />
          ))}
        </Gate1Section>
      ) : null}

      {filteredOther.length > 0 ? (
        <Gate1Section title={GATE1_LABEL.SECTION_OTHER} count={filteredOther.length}>
          {showOtherSearch ? (
            <input
              type="search"
              value={otherSearch}
              onChange={(event) => setOtherSearch(event.target.value)}
              placeholder={GATE1_LABEL.SEARCH_PLACEHOLDER}
              className="mb-3 w-full rounded-[8px] border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-primary"
            />
          ) : null}
          {filteredOther.map((fact) => (
            <Gate1FactGridRow key={fact.key} fact={fact} saving={saving} compact onSave={onSaveFact} />
          ))}
        </Gate1Section>
      ) : null}

      <p className="flex items-start gap-2 rounded-[6px] border border-brand-border bg-brand-primary/5 px-4 py-3 text-sm text-secondary">
        <span aria-hidden="true" className="text-brand-primary">
          ⛨
        </span>
        <span>{GATE1_LABEL.TRUST_LINE}</span>
      </p>

      <Gate1StickyFooter
        confirming={confirming}
        saving={saving}
        disabled={hasUnresolvedConflicts}
        unresolvedCount={unresolvedCount}
        confirmError={confirmError}
        onConfirm={onConfirm}
      >
        <Gate1AddFactForm saving={saving} onAdd={onAddFact} />
      </Gate1StickyFooter>
    </div>
  );
}
