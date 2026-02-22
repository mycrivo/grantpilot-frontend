"use client";

import { useState } from "react";

import type { NgoPastProject } from "@/lib/api/ngoProfile";

type PastProjectCardProps = {
  index: number;
  project: NgoPastProject;
  onChange: (next: NgoPastProject) => void;
  onRemove: () => void;
};

export function PastProjectCard({ index, project, onChange, onRemove }: PastProjectCardProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-[12px] border border-brand-border bg-brand-card-bg">
      <div className="flex items-center justify-between border-b border-brand-border px-4 py-3">
        <button
          type="button"
          className="text-left text-sm font-semibold text-brand-text-primary"
          onClick={() => setExpanded((prev) => !prev)}
        >
          Project {index + 1}: {project.project_title?.trim() || "Untitled"}
        </button>
        <button
          type="button"
          className="text-sm font-medium text-brand-error"
          onClick={onRemove}
        >
          Remove
        </button>
      </div>
      {expanded ? (
        <div className="grid gap-3 p-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-brand-text-primary">Project Title *</label>
            <input
              value={project.project_title}
              onChange={(event) => onChange({ ...project, project_title: event.target.value })}
              className="mt-1 h-11 w-full rounded-[8px] border border-brand-border bg-brand-card-bg px-3 text-[14px] outline-none focus:border-brand-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-primary">Donor/Funder</label>
            <input
              value={project.donor_funder ?? ""}
              onChange={(event) => onChange({ ...project, donor_funder: event.target.value || null })}
              className="mt-1 h-11 w-full rounded-[8px] border border-brand-border bg-brand-card-bg px-3 text-[14px] outline-none focus:border-brand-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-primary">Duration</label>
            <input
              value={project.duration ?? ""}
              onChange={(event) => onChange({ ...project, duration: event.target.value || null })}
              className="mt-1 h-11 w-full rounded-[8px] border border-brand-border bg-brand-card-bg px-3 text-[14px] outline-none focus:border-brand-primary"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-brand-text-primary">Location</label>
            <input
              value={project.location ?? ""}
              onChange={(event) => onChange({ ...project, location: event.target.value || null })}
              className="mt-1 h-11 w-full rounded-[8px] border border-brand-border bg-brand-card-bg px-3 text-[14px] outline-none focus:border-brand-primary"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-brand-text-primary">Summary</label>
            <textarea
              value={project.summary ?? ""}
              onChange={(event) => onChange({ ...project, summary: event.target.value || null })}
              rows={3}
              className="mt-1 w-full rounded-[8px] border border-brand-border bg-brand-card-bg px-3 py-2 text-[14px] outline-none focus:border-brand-primary"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
