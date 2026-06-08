"use client";

import type { ReactNode } from "react";

import { GATE1_LABEL } from "@/components/reports/report-status-labels";

type Gate1StickyFooterProps = {
  confirming: boolean;
  saving: boolean;
  disabled: boolean;
  unresolvedCount: number;
  confirmError: string | null;
  onConfirm: () => Promise<void>;
  children?: ReactNode;
};

export function Gate1StickyFooter({
  confirming,
  saving,
  disabled,
  unresolvedCount,
  confirmError,
  onConfirm,
  children,
}: Gate1StickyFooterProps) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 border-t border-brand-border bg-brand-bg/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
      {unresolvedCount > 0 ? (
        <p className="mb-2 text-sm font-semibold text-brand-warning">
          {GATE1_LABEL.NEEDS_DECISION_COUNT(unresolvedCount)}
        </p>
      ) : null}
      {confirmError ? (
        <p className="mb-2 rounded-[8px] border border-brand-error/30 bg-brand-error/5 px-3 py-2 text-sm text-brand-error">
          {confirmError}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          disabled={confirming || saving || disabled}
          onClick={() => void onConfirm()}
        >
          {confirming ? GATE1_LABEL.CONFIRMING : GATE1_LABEL.CONFIRM_FACTS}
        </button>
        {children}
      </div>
    </div>
  );
}
