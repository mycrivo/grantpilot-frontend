"use client";

import { Gate2QuestionItem } from "@/components/reports/gate2/Gate2QuestionItem";
import { GATE2_LABEL } from "@/components/reports/report-status-labels";
import type { GapCheckResponse } from "@/lib/api/reports";
import type { GapQuestionGroup, GapQuestionState } from "@/lib/gap-view";
import type { NormalizedGapQuestion } from "@/lib/gap-view";

type Gate2AnswerQuestionsProps = {
  gapCheck: GapCheckResponse;
  groups: GapQuestionGroup[];
  questions: NormalizedGapQuestion[];
  states: Record<string, GapQuestionState>;
  saving: boolean;
  continuing: boolean;
  continueError: string | null;
  onDraftChange: (itemKey: string, answerText: string) => void;
  onSaveAnswer: (itemKey: string, answerText: string) => Promise<void>;
  onConfirmExisting: (itemKey: string) => Promise<void>;
  onSkip: (itemKey: string) => Promise<void>;
  onContinue: () => Promise<void>;
};

export function Gate2AnswerQuestions({
  gapCheck,
  groups,
  questions,
  states,
  saving,
  continuing,
  continueError,
  onDraftChange,
  onSaveAnswer,
  onConfirmExisting,
  onSkip,
  onContinue,
}: Gate2AnswerQuestionsProps) {
  const unanswered = questions.filter(
    (question) => (states[question.itemKey]?.disposition ?? "unanswered") === "unanswered",
  ).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-[28px] font-bold leading-tight text-brand-text-primary">{GATE2_LABEL.TITLE}</h1>
        <p className="mt-2 text-[15px] text-secondary">{GATE2_LABEL.SUBTITLE}</p>
      </header>

      <section
        aria-label="Open items"
        className="rounded-[12px] border border-brand-border bg-brand-card-bg p-4"
      >
        <p className="text-sm font-medium text-brand-text-primary">
          {gapCheck.readiness_message ??
            (unanswered === 0
              ? "Nothing needed from you — we're ready to finalize."
              : `${gapCheck.open_items_count} item${gapCheck.open_items_count === 1 ? "" : "s"} need your input before we finalize your draft`)}
        </p>
        {unanswered > 0 ? (
          <p className="mt-2 text-2xl font-bold text-brand-primary">{gapCheck.open_items_count}</p>
        ) : null}
      </section>

      {groups.map((group) => (
        <section key={group.key} className="space-y-4">
          <h2 className="text-lg font-semibold text-brand-text-primary">{group.title}</h2>
          <ul className="space-y-4">
            {group.questions.map((question) => (
              <li key={question.itemKey}>
                <Gate2QuestionItem
                  question={question}
                  state={
                    states[question.itemKey] ?? {
                      disposition: "unanswered",
                      answerText: "",
                      skipReason: null,
                    }
                  }
                  saving={saving}
                  onDraftChange={onDraftChange}
                  onSaveAnswer={onSaveAnswer}
                  onConfirmExisting={onConfirmExisting}
                  onSkip={onSkip}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="flex items-start gap-2 rounded-[6px] border border-brand-border bg-brand-primary/5 px-4 py-3 text-sm text-secondary">
        <span aria-hidden="true" className="text-brand-primary">
          ⛨
        </span>
        <span>{GATE2_LABEL.TRUST_LINE}</span>
      </p>

      {continueError ? (
        <p className="rounded-[8px] border border-brand-error/30 bg-brand-error/5 px-4 py-3 text-sm text-brand-error">
          {continueError}
        </p>
      ) : null}

      <div>
        <button
          type="button"
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          disabled={continuing || saving}
          onClick={() => void onContinue()}
        >
          {continuing ? GATE2_LABEL.CONTINUING : GATE2_LABEL.CONTINUE_TO_DRAFT}
        </button>
      </div>
    </div>
  );
}
