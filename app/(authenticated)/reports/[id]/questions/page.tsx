"use client";

import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useMemo, useState } from "react";

import { Gate2AnswerQuestions } from "@/components/reports/gate2/Gate2AnswerQuestions";
import { ReportNotFound } from "@/components/reports/ReportNotFound";
import { ReportsFunnelHeader } from "@/components/reports/ReportsFunnelHeader";
import { ReportsJourneySteps } from "@/components/reports/ReportsJourneySteps";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import {
  getGapCheck,
  getReport,
  patchGapAnswers,
  submitGate2GapResponses,
  type GapCheckResponse,
} from "@/lib/api/reports";
import { ApiClientError } from "@/lib/api-client";
import { resolveFriendlyApiErrorMessage } from "@/lib/me-error-messages";
import { resolveReportDisplayFunder } from "@/lib/report-display-names";
import {
  buildAnswerPatch,
  buildSkipPatch,
  buildSubmitResponses,
  normalizeGapQuestions,
  type GapQuestionState,
} from "@/lib/gap-view";
import { useReportSubpathGuard } from "@/lib/report-subpath-guard";

type QuestionsReportPageProps = {
  params: Promise<{ id: string }>;
};

function initialStates(gapCheck: GapCheckResponse): Record<string, GapQuestionState> {
  const states: Record<string, GapQuestionState> = {};
  for (const item of gapCheck.missing_items) {
    states[item.item_key] = {
      disposition: "unanswered",
      answerText: "",
      skipReason: null,
    };
  }
  return states;
}

export default function QuestionsReportPage({ params }: QuestionsReportPageProps) {
  const { id: reportId } = use(params);
  const router = useRouter();
  const guard = useReportSubpathGuard(reportId, "questions");
  const [gapCheck, setGapCheck] = useState<GapCheckResponse | null>(null);
  const [funderName, setFunderName] = useState("");
  const [states, setStates] = useState<Record<string, GapQuestionState>>({});
  const [error, setError] = useState<ApiClientError | null>(null);
  const [saving, setSaving] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [continueError, setContinueError] = useState<string | null>(null);

  const loadGapCheck = useCallback(async () => {
    const report = await getReport(reportId);
    const check = await getGapCheck(reportId);

    setFunderName(resolveReportDisplayFunder(report.funder_name) ?? "");
    setGapCheck(check);
    setStates(initialStates(check));
    setError(null);
    return check;
  }, [reportId]);

  useEffect(() => {
    if (!guard.allowed) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const check = await loadGapCheck();
        if (!cancelled && check) {
          setGapCheck(check);
        }
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setError(
          loadError instanceof ApiClientError
            ? loadError
            : new ApiClientError(500, "Failed to load missing questions."),
        );
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [guard.allowed, loadGapCheck, reportId, router]);

  const questions = useMemo(() => {
    if (!gapCheck) {
      return [];
    }
    return normalizeGapQuestions(gapCheck, funderName);
  }, [gapCheck, funderName]);

  const handleDraftChange = (itemKey: string, answerText: string) => {
    setStates((current) => ({
      ...current,
      [itemKey]: {
        ...current[itemKey],
        disposition: current[itemKey]?.disposition === "skipped" ? "skipped" : "unanswered",
        answerText,
        skipReason: current[itemKey]?.skipReason ?? null,
      },
    }));
  };

  const handleSaveAnswer = async (itemKey: string, answerText: string) => {
    setSaving(true);
    setContinueError(null);
    try {
      await patchGapAnswers(reportId, buildAnswerPatch(itemKey, answerText.trim()));
      setStates((current) => ({
        ...current,
        [itemKey]: {
          disposition: "answered",
          answerText: answerText.trim(),
          skipReason: null,
        },
      }));
    } catch (patchError) {
      setError(
        patchError instanceof ApiClientError
          ? patchError
          : new ApiClientError(500, "Failed to save answer."),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async (itemKey: string) => {
    setSaving(true);
    setContinueError(null);
    try {
      await patchGapAnswers(reportId, buildSkipPatch(itemKey, "cannot_provide"));
      setStates((current) => ({
        ...current,
        [itemKey]: {
          disposition: "skipped",
          answerText: "",
          skipReason: "cannot_provide",
        },
      }));
    } catch (patchError) {
      setError(
        patchError instanceof ApiClientError
          ? patchError
          : new ApiClientError(500, "Failed to skip question."),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = async () => {
    if (!gapCheck) {
      return;
    }

    setContinuing(true);
    setContinueError(null);

    try {
      const responses = buildSubmitResponses(questions, states);
      await submitGate2GapResponses(reportId, { responses });
      router.replace(`/reports/${encodeURIComponent(reportId)}`);
    } catch (submitError) {
      setContinueError(
        submitError instanceof ApiClientError
          ? resolveFriendlyApiErrorMessage(submitError, "Failed to continue to draft. Please try again.")
          : "Failed to continue to draft. Please try again.",
      );
      setContinuing(false);
    }
  };

  if (guard.notFound) {
    return <ReportNotFound />;
  }

  if (guard.error) {
    return <ErrorDisplay title="Missing questions unavailable" error={guard.error} />;
  }

  if (guard.loading || !guard.allowed) {
    return <LoadingSkeleton variant="page" lines={8} />;
  }

  if (error) {
    return <ErrorDisplay title="Missing questions unavailable" error={error} />;
  }

  if (!gapCheck) {
    return <LoadingSkeleton variant="page" lines={8} />;
  }

  return (
    <section className="space-y-6">
      <ReportsFunnelHeader />
      <ReportsJourneySteps current="questions" />
      <Gate2AnswerQuestions
        questions={questions}
        states={states}
        saving={saving}
        continuing={continuing}
        continueError={continueError}
        onDraftChange={handleDraftChange}
        onSaveAnswer={handleSaveAnswer}
        onSkip={handleSkip}
        onContinue={handleContinue}
      />
    </section>
  );
}
