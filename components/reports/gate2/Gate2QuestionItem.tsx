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
  onConfirmExisting: (itemKey: string) => Promise<void>;
  onSkip: (itemKey: string) => Promise<void>;
};

export function Gate2QuestionItem({
  question,
  state,
  saving,
  onDraftChange,
  onSaveAnswer,
  onConfirmExisting,
  onSkip,
}: Gate2QuestionItemProps) {
  const statusLabel =
    state.disposition === "answered"
      ? GATE2_LABEL.SAVED
      : state.disposition === "skipped"
        ? GATE2_LABEL.SKIPPED
        : null;

  const showConfirmExisting =
    question.suggestedAction === "confirm_existing" && question.confirmExistingExcerpt;

  return (
    <article className="rounded-[12px] border border-brand-border bg-brand-card-bg p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
        {question.sectionTag}
      </p>
      <h2 className="mt-1 text-base font-semibold text-brand-text-primary">{question.question}</h2>

      {question.rationale ? (
        <p className="mt-2 text-sm text-secondary">{question.rationale}</p>
      ) : null}

      {showConfirmExisting ? (
        <div className="mt-4 rounded-[8px] border border-brand-border bg-brand-primary/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
            On file
          </p>
          <p className="mt-1 text-sm text-brand-text-primary">{question.confirmExistingExcerpt}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-primary text-sm disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving}
              onClick={() => void onConfirmExisting(question.itemKey)}
            >
              Yes, use this
            </button>
            <button
              type="button"
              className="text-sm font-semibold text-brand-primary hover:underline disabled:opacity-60"
              disabled={saving}
              onClick={() => onDraftChange(question.itemKey, "")}
            >
              Provide different value
            </button>
          </div>
        </div>
      ) : null}

      {!showConfirmExisting || state.answerText || state.disposition === "answered" ? (
        <textarea
          value={state.answerText}
          onChange={(event) => onDraftChange(question.itemKey, event.target.value)}
          placeholder={GATE2_LABEL.ANSWER_PLACEHOLDER}
          aria-label={`Answer: ${question.question}`}
          disabled={state.disposition === "skipped"}
          className="mt-4 min-h-[120px] w-full rounded-[8px] border border-brand-border px-3 py-3 text-sm outline-none focus:border-brand-primary disabled:bg-brand-divider disabled:text-secondary"
        />
      ) : null}

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
