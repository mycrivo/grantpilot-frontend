"use client";

import { AssumptionsList } from "@/components/proposal/AssumptionsList";
import { StatusBadge } from "@/components/shared/StatusBadge";

type ProposalSection = {
  submission_item_id: string;
  label: string;
  generation_status: "GENERATED" | "FAILED" | "MANUAL_REQUIRED";
  archetype: string | null;
  content: {
    text: string;
    assumptions: string[];
    evidence_used: string[];
  };
  failure_reason: string | null;
  constraints_applied: {
    word_limit: number | null;
    word_limit_respected: boolean | null;
  } | null;
};

type SectionContentProps = {
  section: ProposalSection;
};

function sectionStatusTone(status: ProposalSection["generation_status"]) {
  if (status === "GENERATED") {
    return "success";
  }
  if (status === "FAILED") {
    return "error";
  }
  return "neutral";
}

export function SectionContent({ section }: SectionContentProps) {
  const constraints = section.constraints_applied;

  return (
    <article id={`section-${section.submission_item_id}`} className="card space-y-4 scroll-mt-24">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4>{section.label}</h4>
        <StatusBadge label={section.generation_status} tone={sectionStatusTone(section.generation_status)} />
      </div>

      {section.generation_status === "GENERATED" ? (
        <>
          <p className="whitespace-pre-wrap text-brand-text-primary">{section.content.text}</p>
          <AssumptionsList title="Assumptions made by AI" items={section.content.assumptions} />
          <AssumptionsList title="Evidence referenced" items={section.content.evidence_used} />
          {constraints && constraints.word_limit !== null ? (
            <p className="text-sm text-secondary">
              Word limit: {constraints.word_limit}{" "}
              {constraints.word_limit_respected === true ? "✓ respected" : constraints.word_limit_respected === false ? "⚠ not respected" : ""}
            </p>
          ) : null}
        </>
      ) : null}

      {section.generation_status === "FAILED" ? (
        <div className="space-y-2">
          <p className="text-brand-error">
            This section could not be generated. You can regenerate the full proposal to retry.
          </p>
          {section.failure_reason ? <p className="text-sm text-secondary">Reason: {section.failure_reason}</p> : null}
        </div>
      ) : null}

      {section.generation_status === "MANUAL_REQUIRED" ? (
        <p className="text-secondary">
          This section requires manual input. AI generation is not available for this item.
        </p>
      ) : null}
    </article>
  );
}
