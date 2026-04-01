"use client";

import { useEffect, useMemo, useState } from "react";

import { ApiClientError } from "@/lib/api-client";
import {
  preFlightCheck,
  type PreFlightResponse,
  type PreFlightSection,
  updateKnowledgeBank,
} from "@/lib/api/proposals";

type PreFlightCheckProps = {
  fundingOpportunityId: string;
  selectedVariantId?: string;
  onGenerate: () => Promise<void> | void;
  onBack: () => void;
};

function progressColor(percent: number) {
  if (percent >= 100) {
    return "bg-emerald-500";
  }
  if (percent >= 50) {
    return "bg-amber-500";
  }
  return "bg-red-500";
}

export function PreFlightCheck({
  fundingOpportunityId,
  selectedVariantId,
  onGenerate,
  onBack,
}: PreFlightCheckProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preFlightError, setPreFlightError] = useState<ApiClientError | null>(null);
  const [submitError, setSubmitError] = useState<ApiClientError | null>(null);
  const [preFlight, setPreFlight] = useState<PreFlightResponse | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      setPreFlightError(null);
      setSubmitError(null);

      try {
        const payload = await preFlightCheck(fundingOpportunityId, selectedVariantId);
        if (cancelled) {
          return;
        }

        if (payload.ready_to_generate) {
          await onGenerate();
          return;
        }

        setPreFlight(payload);
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiClientError) {
          setPreFlightError(error);
        } else {
          setPreFlightError(new ApiClientError(500, "We couldn't run the pre-flight check right now."));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [fundingOpportunityId, onGenerate, selectedVariantId]);

  const needsInputSections = useMemo(
    () => preFlight?.sections.filter((section) => section.status === "NEEDS_INPUT") ?? [],
    [preFlight],
  );
  const manualSections = useMemo(
    () => preFlight?.sections.filter((section) => section.status === "MANUAL_REQUIRED") ?? [],
    [preFlight],
  );
  const readySections = useMemo(
    () => preFlight?.sections.filter((section) => section.status === "READY") ?? [],
    [preFlight],
  );

  const allNeedsInputFilled = useMemo(() => {
    if (needsInputSections.length === 0) {
      return true;
    }
    return needsInputSections.every((section) => (responses[section.submission_item_id] ?? "").trim().length > 0);
  }, [needsInputSections, responses]);

  const onSubmit = async () => {
    if (!preFlight || !allNeedsInputFilled || isSubmitting) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await updateKnowledgeBank(
        needsInputSections.map((section: PreFlightSection) => ({
          key: section.submission_item_id,
          text: (responses[section.submission_item_id] ?? "").trim(),
          opportunity_id: fundingOpportunityId,
        })),
      );
      await onGenerate();
    } catch (error) {
      if (error instanceof ApiClientError) {
        setSubmitError(error);
      } else {
        setSubmitError(new ApiClientError(500, "We couldn't save your responses. Please try again."));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="card space-y-3">
        <h4>Checking profile readiness...</h4>
        <p className="text-secondary">We are analysing your profile against this opportunity.</p>
      </div>
    );
  }

  if (preFlightError) {
    return (
      <div className="card space-y-3">
        <h4>Pre-flight check failed</h4>
        <p className="text-secondary">{preFlightError.message}</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
            Retry
          </button>
          <button type="button" className="text-sm font-semibold text-brand-primary hover:underline" onClick={onBack}>
            Back
          </button>
        </div>
      </div>
    );
  }

  if (!preFlight) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div className="card space-y-3">
        <p className="text-sm font-semibold text-brand-text-primary">
          Your profile is {preFlight.readiness_percent}% ready for {preFlight.opportunity_title}
        </p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-brand-divider">
          <div
            className={`h-full rounded-full transition-all ${progressColor(preFlight.readiness_percent)}`}
            style={{ width: `${Math.max(0, Math.min(preFlight.readiness_percent, 100))}%` }}
          />
        </div>
      </div>

      <div className="card space-y-4">
        <h3>Complete these details to generate a full proposal</h3>

        {needsInputSections.map((section) => (
          <div key={section.submission_item_id} className="space-y-2 rounded-[8px] border border-brand-border p-4">
            <h4>{section.label}</h4>
            <p className="text-sm text-secondary">{section.prompt_for_user ?? "Please provide details for this section."}</p>
            <textarea
              rows={6}
              value={responses[section.submission_item_id] ?? ""}
              onChange={(event) =>
                setResponses((prev) => ({
                  ...prev,
                  [section.submission_item_id]: event.target.value,
                }))
              }
              className="w-full rounded-[8px] border border-brand-border bg-brand-card-bg px-3 py-2 text-[14px] outline-none focus:border-brand-primary"
              placeholder="Add detailed context you want included in the proposal draft."
            />
          </div>
        ))}

        {manualSections.length > 0 ? (
          <div className="space-y-2 rounded-[8px] border border-brand-border bg-brand-card-bg p-4">
            <h4>Manual sections</h4>
            <ul className="space-y-2 text-sm text-secondary">
              {manualSections.map((section) => (
                <li key={section.submission_item_id}>
                  ☐ {section.label} — this will need to be completed manually (e.g., CV, signed agreement). GrantPilot
                  can&apos;t generate this, but we&apos;ll include a placeholder in your proposal.
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {readySections.length > 0 ? (
          <div className="space-y-2 rounded-[8px] border border-emerald-500/30 bg-emerald-500/5 p-4">
            <h4>Ready sections</h4>
            <ul className="space-y-1 text-sm text-brand-text-primary">
              {readySections.map((section) => (
                <li key={section.submission_item_id}>✓ {section.label} — ready to generate</li>
              ))}
            </ul>
          </div>
        ) : null}

        {submitError ? <p className="text-sm text-brand-error">{submitError.message}</p> : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-primary inline-flex items-center disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!allNeedsInputFilled || isSubmitting}
            onClick={() => void onSubmit()}
          >
            Save &amp; Generate Proposal
          </button>
          {!allNeedsInputFilled ? (
            <p className="text-sm text-secondary">Complete all required sections to continue.</p>
          ) : null}
          <button type="button" className="text-sm font-semibold text-brand-primary hover:underline" onClick={onBack}>
            Back
          </button>
        </div>
      </div>
    </section>
  );
}
