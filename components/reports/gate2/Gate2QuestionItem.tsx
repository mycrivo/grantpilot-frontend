"use client";

import { GATE2_LABEL } from "@/components/reports/report-status-labels";
import type { GapQuestionState } from "@/lib/gap-view";
import type { NormalizedGapQuestion } from "@/lib/gap-view";

type Gate2QuestionItemProps = {
  question: NormalizedGapQuestion;
  state: GapQuestionState;
  saving: boolean;
  onDraftChange: (itemKey: string, answerText: string) => void;
  onSaveAnswer: (itemKey: string, answerText: string) => Promise<void>;
  onSkip: (itemKey: string) => Promise<void>;
};

export function Gate2QuestionItem({
  question,
  state,
  saving,
  onDraftChange,
  onSaveAnswer,
  onSkip,
}: Gate2QuestionItemProps) {
  const statusLabel =
    state.disposition === "answered"
      ? GATE2_LABEL.SAVED
      : state.disposition === "skipped"
        ? GATE2_LABEL.SKIPPED
        : null;

  return (
    <article className="rounded-[12px] border border-brand-border bg-brand-card-bg p-4">
      <h2 className="text-base font-semibold text-brand-text-primary">{question.question}</h2>

      <div className="mt-2 space-y-1 text-sm text-secondary">
        <p>{question.rationale}</p>
        <p className="font-medium text-brand-text-primary">{question.sectionTag}</p>
      </div>

      <textarea
        value={state.answerText}
        onChange={(event) => onDraftChange(question.itemKey, event.target.value)}
        placeholder={GATE2_LABEL.ANSWER_PLACEHOLDER}
        aria-label={`Answer: ${question.question}`}
        disabled={state.disposition === "skipped"}
        className="mt-4 min-h-[120px] w-full rounded-[8px] border border-brand-border px-3 py-3 text-sm outline-none focus:border-brand-primary disabled:bg-brand-divider disabled:text-secondary"
      />

      {statusLabel ? <p className="mt-2 text-sm font-medium text-brand-primary">{statusLabel}</p> : null}

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button
          type="button"
          className="btn-primary text-sm disabled:cursor-not-allowed disabled:opacity-60"
          disabled={saving || !state.answerText.trim() || state.disposition === "skipped"}
          onClick={() => void onSaveAnswer(question.itemKey, state.answerText)}
        >
          {saving ? GATE2_LABEL.SAVING : GATE2_LABEL.SAVE_ANSWER}
        </button>
        <button
          type="button"
          className="text-sm font-semibold text-brand-primary hover:underline disabled:opacity-60"
          disabled={saving}
          onClick={() => void onSkip(question.itemKey)}
        >
          {GATE2_LABEL.SKIP}
        </button>
      </div>
    </article>
  );
}
