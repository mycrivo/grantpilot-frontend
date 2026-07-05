"use client";

import Link from "next/link";
import { useState } from "react";

import { ackProposalCheckpointProceed, reportUploadPath } from "@/lib/api/reports";
import { ApiClientError } from "@/lib/api-client";
import {
  getProposalCheckpoint,
  missingContentLabels,
  type ProposalCheckpoint,
} from "@/lib/proposal-checkpoint";
import { resolveUnreadableSourceDisplayLabel } from "@/lib/unreadable-source-display";
import type { NormalizedUnreadableSource } from "@/lib/knowledge-bank-view";

type ProposalExtractionCheckpointProps = {
  reportId: string;
  checkpoint: ProposalCheckpoint;
  documentFilenameById?: Readonly<Record<string, string>>;
  onProceedStarted?: () => void;
};

export function ProposalExtractionCheckpoint({
  reportId,
  checkpoint,
  documentFilenameById,
  onProceedStarted,
}: ProposalExtractionCheckpointProps) {
  const [proceeding, setProceeding] = useState(false);
  const [proceedError, setProceedError] = useState<string | null>(null);

  const displaySource: NormalizedUnreadableSource = {
    sourceDocumentId: checkpoint.failedDocumentId,
    sourceLabel: checkpoint.originalFilename,
    explanation: "",
  };
  const filename = resolveUnreadableSourceDisplayLabel(displaySource, documentFilenameById);
  const missingLabels = missingContentLabels(checkpoint.missingContentKeys);

  const handleProceed = async () => {
    setProceeding(true);
    setProceedError(null);
    try {
      await ackProposalCheckpointProceed(reportId);
      onProceedStarted?.();
    } catch (error) {
      setProceedError(
        error instanceof ApiClientError
          ? error.message
          : "Could not continue without the proposal. Please try again.",
      );
      setProceeding(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6 text-left">
      <header className="text-center">
        <h1 className="text-[28px] font-bold leading-tight text-brand-text-primary">
          We could not read your proposal
        </h1>
        <p className="mt-2 text-[15px] text-secondary">
          Reading stalled on <span className="font-semibold text-brand-text-primary">{filename}</span>.
          You can replace the file and try again, or continue without proposal content.
        </p>
      </header>

      <div className="rounded-[12px] border border-brand-warning/30 bg-brand-warning/5 p-4">
        <h2 className="font-semibold text-brand-text-primary">What will be missing if you continue</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-secondary">
          {missingLabels.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-secondary">
          We recommend replacing the proposal and reading your documents again — a second attempt often
          succeeds.
        </p>
      </div>

      {proceedError ? (
        <p className="text-sm text-brand-error" role="alert">
          {proceedError}
        </p>
      ) : null}

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
        <Link
          href={reportUploadPath(reportId)}
          className="btn-primary inline-flex min-h-10 items-center justify-center px-6 text-center"
        >
          Replace proposal and try again
        </Link>
        <button
          type="button"
          className="inline-flex min-h-10 items-center justify-center rounded-[8px] border border-brand-border bg-brand-card-bg px-6 text-sm font-semibold text-brand-text-primary hover:bg-brand-surface-subtle disabled:opacity-60"
          disabled={proceeding}
          onClick={() => void handleProceed()}
        >
          {proceeding ? "Continuing…" : "Continue without proposal content"}
        </button>
      </div>
    </div>
  );
}

export function proposalCheckpointFromJob(
  job: Parameters<typeof getProposalCheckpoint>[0],
): ProposalCheckpoint | null {
  const checkpoint = getProposalCheckpoint(job);
  if (!checkpoint || checkpoint.acknowledged) {
    return null;
  }
  return checkpoint;
}
