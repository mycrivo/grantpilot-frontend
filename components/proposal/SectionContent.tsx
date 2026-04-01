"use client";

import { useEffect, useMemo, useState } from "react";

import { AssumptionsList } from "@/components/proposal/AssumptionsList";
import { StatusBadge } from "@/components/shared/StatusBadge";

type ProposalSection = {
  submission_item_id: string;
  label: string;
  generation_status: "GENERATED" | "FAILED" | "MANUAL_REQUIRED" | "NEEDS_USER_INPUT";
  missing_inputs?: string[];
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
  regenerationLoading?: boolean;
  regenerationErrorMessage?: string | null;
  onSaveAndRegenerate?: (submissionItemId: string, responseText: string) => Promise<void> | void;
};

function sectionStatusTone(status: ProposalSection["generation_status"]) {
  if (status === "GENERATED") {
    return "success";
  }
  if (status === "FAILED") {
    return "error";
  }
  if (status === "NEEDS_USER_INPUT") {
    return "warning";
  }
  return "neutral";
}

function humanizeMissingInput(field: string) {
  const cleaned = field.replace(/^ngo_profile\./, "").replaceAll("_", " ").trim();
  if (!cleaned) {
    return "Additional details";
  }
  const lowered = cleaned.toLowerCase();
  return lowered.charAt(0).toUpperCase() + lowered.slice(1);
}

export function SectionContent({
  section,
  regenerationLoading = false,
  regenerationErrorMessage,
  onSaveAndRegenerate,
}: SectionContentProps) {
  const constraints = section.constraints_applied;
  const [responseText, setResponseText] = useState("");
  const missingInputs = useMemo(
    () => (Array.isArray(section.missing_inputs) ? section.missing_inputs : []),
    [section.missing_inputs],
  );
  const canSubmit = responseText.trim().length > 0 && !regenerationLoading;

  useEffect(() => {
    setResponseText("");
  }, [section.submission_item_id]);

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

      {section.generation_status === "NEEDS_USER_INPUT" ? (
        <div className="space-y-3">
          <p className="text-brand-text-primary">This section needs more information from you to generate.</p>
          {missingInputs.length > 0 ? (
            <div className="space-y-1">
              <p className="text-sm font-medium text-brand-text-primary">Missing details:</p>
              <ul className="list-inside list-disc space-y-1 text-sm text-secondary">
                {missingInputs.map((field) => (
                  <li key={field}>{humanizeMissingInput(field)}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <textarea
            rows={6}
            value={responseText}
            onChange={(event) => setResponseText(event.target.value)}
            className="w-full rounded-[8px] border border-brand-border bg-brand-card-bg px-3 py-2 text-[14px] outline-none focus:border-brand-primary"
            placeholder="Add the missing details for this section."
          />
          {regenerationErrorMessage ? <p className="text-sm text-brand-error">{regenerationErrorMessage}</p> : null}
          <button
            type="button"
            className="btn-primary inline-flex items-center disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canSubmit}
            onClick={() => void onSaveAndRegenerate?.(section.submission_item_id, responseText.trim())}
          >
            {regenerationLoading ? "Saving & Regenerating..." : "Save & Regenerate"}
          </button>
        </div>
      ) : null}
    </article>
  );
}
