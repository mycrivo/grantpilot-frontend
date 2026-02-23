"use client";

type SectionNavItem = {
  submission_item_id: string;
  label: string;
  generation_status: "GENERATED" | "FAILED" | "MANUAL_REQUIRED";
};

type SectionNavProps = {
  sections: SectionNavItem[];
  activeSectionId: string | null;
  onSelect: (sectionId: string) => void;
};

function statusIndicatorClass(status: SectionNavItem["generation_status"]) {
  if (status === "GENERATED") {
    return "bg-brand-success";
  }
  if (status === "FAILED") {
    return "bg-brand-error";
  }
  return "bg-brand-neutral";
}

export function SectionNav({ sections, activeSectionId, onSelect }: SectionNavProps) {
  return (
    <nav className="card space-y-2">
      <h4>Sections</h4>
      {sections.map((section) => {
        const isActive = activeSectionId === section.submission_item_id;
        return (
          <button
            key={section.submission_item_id}
            type="button"
            className={`flex w-full items-center gap-2 rounded-[8px] border px-3 py-2 text-left text-sm ${
              isActive
                ? "border-brand-primary bg-brand-primary/10 text-brand-text-primary"
                : "border-brand-border bg-brand-card-bg text-brand-text-primary"
            }`}
            onClick={() => onSelect(section.submission_item_id)}
          >
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${statusIndicatorClass(section.generation_status)}`} />
            <span className="truncate">{section.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
