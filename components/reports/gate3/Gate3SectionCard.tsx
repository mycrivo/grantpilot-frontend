"use client";

import { useState } from "react";

import { GATE3_LABEL } from "@/components/reports/report-status-labels";
import { CRITIC_REASON_PREFIX } from "@/lib/critic-reason-labels";
import type { NormalizedReportSection } from "@/lib/report-section-view";

type Gate3SectionCardProps = {
  section: NormalizedReportSection;
  saving: boolean;
  onSave: (sectionKey: string, contentText: string) => Promise<void>;
};

function statusTone(displayStatus: NormalizedReportSection["displayStatus"]): string {
  if (displayStatus === "needs_review") {
    return "border-brand-warning/40 bg-brand-warning/5";
  }
  if (displayStatus === "not_provided") {
    return "border-brand-border bg-brand-divider/30";
  }
  return "border-brand-border bg-brand-card-bg";
}

function statusBadgeClass(displayStatus: NormalizedReportSection["displayStatus"]): string {
  if (displayStatus === "needs_review") {
    return "border-brand-warning/30 text-brand-warning";
  }
  if (displayStatus === "edited") {
    return "border-brand-primary/30 text-brand-primary";
  }
  if (displayStatus === "not_provided") {
    return "border-brand-border text-secondary";
  }
  return "border-brand-success/30 text-brand-success";
}

export function Gate3SectionCard({ section, saving, onSave }: Gate3SectionCardProps) {
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState(section.fullText);

  const editLabel = section.isNotProvided ? GATE3_LABEL.ADD_CONTENT : GATE3_LABEL.EDIT_SECTION;

  const handleSave = async () => {
    await onSave(section.sectionKey, draftText);
    setEditing(false);
  };

  return (
    <article
      id={`section-${section.sectionKey}`}
      className={`rounded-[12px] border p-4 ${statusTone(section.displayStatus)}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="font-semibold text-brand-text-primary">{section.label}</h2>
        <span
          className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(section.displayStatus)}`}
        >
          {section.statusLabel}
        </span>
      </div>

      {section.primaryCriticIssue ? (
        <div className="mt-3 rounded-[8px] border border-brand-warning/30 bg-brand-warning/5 px-3 py-2 text-sm">
          {section.severityLabel ? (
            <p className="font-semibold text-brand-warning">{section.severityLabel}</p>
          ) : null}
          <p className={section.severityLabel ? "mt-1 text-secondary" : "text-secondary"}>
            <span className="font-medium text-brand-text-primary">{CRITIC_REASON_PREFIX}</span>
            {section.primaryCriticIssue}
          </p>
        </div>
      ) : null}

      {!editing ? <p className="mt-3 text-sm text-secondary">{section.previewText}</p> : null}

      {editing ? (
        <div className="mt-4">
          <label htmlFor={`edit-${section.sectionKey}`} className="mb-2 block text-sm font-semibold text-brand-text-primary">
            {GATE3_LABEL.EDIT_SECTION_LABEL}
          </label>
          <textarea
            id={`edit-${section.sectionKey}`}
            value={draftText}
            onChange={(event) => setDraftText(event.target.value)}
            className="min-h-[160px] w-full rounded-[8px] border border-brand-border px-3 py-3 text-sm outline-none focus:border-brand-primary"
          />
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-primary text-sm disabled:opacity-60"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              {saving ? GATE3_LABEL.SAVING : GATE3_LABEL.SAVE_SECTION}
            </button>
            <button
              type="button"
              className="text-sm font-semibold text-secondary"
              disabled={saving}
              onClick={() => {
                setDraftText(section.fullText);
                setEditing(false);
              }}
            >
              {GATE3_LABEL.CANCEL}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="mt-3 rounded-[8px] border border-brand-border px-3 py-1.5 text-sm font-semibold text-brand-text-primary hover:bg-brand-divider"
          onClick={() => {
            setDraftText(section.fullText);
            setEditing(true);
          }}
        >
          {editLabel}
        </button>
      )}
    </article>
  );
}
