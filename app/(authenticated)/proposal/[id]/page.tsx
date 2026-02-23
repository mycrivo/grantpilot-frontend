"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { ExportModal } from "@/components/proposal/ExportModal";
import { SectionContent } from "@/components/proposal/SectionContent";
import { SectionNav } from "@/components/proposal/SectionNav";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ApiClientError, apiRequest, type ApiErrorEnvelope } from "@/lib/api-client";

type ProposalStatus = "DRAFT" | "DEGRADED";
type SectionGenerationStatus = "GENERATED" | "FAILED" | "MANUAL_REQUIRED";

type ProposalDetailResponse = {
  id: string;
  funding_opportunity_id: string;
  fit_scan_id: string | null;
  opportunity_title: string | null;
  status: ProposalStatus;
  version: number;
  regeneration_count: number;
  created_at: string;
  updated_at: string;
  content_json: {
    sections: ProposalSection[];
    generation_summary: {
      total_items: number;
      generated: number;
      failed: number;
      manual_required: number;
      warnings: string[];
    };
  };
};

type ProposalSection = {
  submission_item_id: string;
  label: string;
  generation_status: SectionGenerationStatus;
  archetype: string | null;
  content: {
    text: string;
    assumptions: string[];
    evidence_used: string[];
  };
  failure_reason: string | null;
  constraints_applied: {
    word_limit: number | null;
    word_limit_respected: boolean | null;
  } | null;
};

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const REGEN_MAX = 3;

function parseSafeJson<T>(text: string): T | null {
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function getProposalStatusTone(status: ProposalStatus) {
  return status === "DRAFT" ? "success" : "warning";
}

function isProposalSection(value: unknown): value is ProposalSection {
  if (!value || typeof value !== "object") {
    return false;
  }
  const section = value as Partial<ProposalSection>;
  const validStatus = section.generation_status === "GENERATED" ||
    section.generation_status === "FAILED" ||
    section.generation_status === "MANUAL_REQUIRED";
  return (
    typeof section.submission_item_id === "string" &&
    typeof section.label === "string" &&
    validStatus &&
    !!section.content &&
    typeof section.content === "object" &&
    typeof section.content.text === "string" &&
    Array.isArray(section.content.assumptions) &&
    Array.isArray(section.content.evidence_used)
  );
}

function isProposalDetailResponse(value: unknown): value is ProposalDetailResponse {
  if (!value || typeof value !== "object") {
    return false;
  }
  const proposal = value as Partial<ProposalDetailResponse>;
  if (
    typeof proposal.id !== "string" ||
    (proposal.status !== "DRAFT" && proposal.status !== "DEGRADED") ||
    typeof proposal.version !== "number" ||
    typeof proposal.regeneration_count !== "number" ||
    !proposal.content_json ||
    typeof proposal.content_json !== "object" ||
    !Array.isArray(proposal.content_json.sections) ||
    !proposal.content_json.sections.every(isProposalSection)
  ) {
    return false;
  }
  const summary = proposal.content_json.generation_summary;
  return !!summary && typeof summary === "object" &&
    typeof summary.total_items === "number" &&
    typeof summary.generated === "number" &&
    typeof summary.failed === "number" &&
    typeof summary.manual_required === "number" &&
    Array.isArray(summary.warnings);
}

function parseFilenameFromDisposition(disposition: string | null, fallbackId: string) {
  if (!disposition) {
    return `proposal-${fallbackId}.docx`;
  }
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1].replace(/["']/g, ""));
  }
  const basicMatch = disposition.match(/filename="?([^";]+)"?/i);
  if (basicMatch?.[1]) {
    return basicMatch[1];
  }
  return `proposal-${fallbackId}.docx`;
}

export default function ProposalViewerPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user, getAccessToken } = useAuth();

  const proposalId = params?.id ?? "";

  const [loading, setLoading] = useState(true);
  const [proposal, setProposal] = useState<ProposalDetailResponse | null>(null);
  const [loadError, setLoadError] = useState<ApiClientError | null>(null);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [regenLoading, setRegenLoading] = useState(false);
  const [regenError, setRegenError] = useState<ApiClientError | null>(null);

  const [exportOpen, setExportOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<ApiClientError | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadProposal = async () => {
      if (!proposalId) {
        setLoadError(new ApiClientError(404, "This proposal was not found."));
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(null);
      setSchemaError(null);
      try {
        const payload = await apiRequest<unknown>(`/api/proposals/${encodeURIComponent(proposalId)}`, { method: "GET" });
        if (!isProposalDetailResponse(payload)) {
          setSchemaError(
            "STOP: Proposal response content_json does not match API_CONTRACT.md Section 9.2 (missing sections/generation_status/label/content).",
          );
          setProposal(null);
          return;
        }
        setProposal(payload);
        if (payload.content_json.sections.length > 0) {
          setActiveSectionId(payload.content_json.sections[0].submission_item_id);
        }
      } catch (error) {
        if (error instanceof ApiClientError) {
          setLoadError(error);
        } else {
          setLoadError(new ApiClientError(500, "Something went wrong. Please try again."));
        }
      } finally {
        setLoading(false);
      }
    };

    void loadProposal();
  }, [proposalId]);

  const selectedSection = useMemo(() => {
    if (!proposal || !activeSectionId) {
      return null;
    }
    return proposal.content_json.sections.find((section) => section.submission_item_id === activeSectionId) ?? null;
  }, [activeSectionId, proposal]);

  const exportSummary = useMemo(() => {
    if (!proposal) {
      return { generated: 0, failed: 0, manualRequired: 0 };
    }
    return {
      generated: proposal.content_json.sections.filter((s) => s.generation_status === "GENERATED").length,
      failed: proposal.content_json.sections.filter((s) => s.generation_status === "FAILED").length,
      manualRequired: proposal.content_json.sections.filter((s) => s.generation_status === "MANUAL_REQUIRED").length,
    };
  }, [proposal]);

  const regenRemaining = proposal ? Math.max(0, REGEN_MAX - proposal.regeneration_count) : 0;
  const isFreePlan = user?.plan === "FREE";

  const runRegeneration = async () => {
    if (!proposal) {
      return;
    }
    setRegenLoading(true);
    setRegenError(null);
    try {
      const payload = await apiRequest<unknown>(
        `/api/proposals/${encodeURIComponent(proposal.id)}/regenerate`,
        {
          method: "POST",
          body: JSON.stringify({ mode: "FULL" }),
        },
      );
      if (!isProposalDetailResponse(payload)) {
        setSchemaError(
          "STOP: Regeneration response does not match API_CONTRACT.md Section 9.2 (missing sections/generation_status/label/content).",
        );
        setProposal(null);
        return;
      }
      setProposal(payload);
      if (payload.content_json.sections.length > 0) {
        setActiveSectionId(payload.content_json.sections[0].submission_item_id);
      }
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.status === 403 && isFreePlan) {
          setRegenError(new ApiClientError(403, "Regeneration isn't available on the Free plan."));
        } else if (error.status === 429) {
          setRegenError(new ApiClientError(429, "Regeneration limit reached.", { error_code: error.errorCode ?? "QUOTA_EXCEEDED" }));
        } else {
          setRegenError(error);
        }
      } else {
        setRegenError(new ApiClientError(500, "Something went wrong. Please try again."));
      }
    } finally {
      setRegenLoading(false);
    }
  };

  const runExport = async () => {
    if (!proposal) {
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
    const token = getAccessToken();
    if (!baseUrl || !token) {
      setExportError(new ApiClientError(401, "You need to sign in again before exporting."));
      return;
    }

    setExportLoading(true);
    setExportError(null);
    setExportSuccess(null);
    try {
      const response = await fetch(`${baseUrl}/api/proposals/${encodeURIComponent(proposal.id)}/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ format: "DOCX" }),
      });

      if (!response.ok) {
        const text = await response.text();
        const envelope = parseSafeJson<ApiErrorEnvelope>(text);
        throw new ApiClientError(
          response.status,
          envelope?.message ?? "Something went wrong. Please try again.",
          envelope ?? undefined,
        );
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes(DOCX_MIME)) {
        throw new ApiClientError(500, "Export response was not a DOCX file.");
      }

      const blob = await response.blob();
      const filename = parseFilenameFromDisposition(response.headers.get("content-disposition"), proposal.id);
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);

      setExportOpen(false);
      setExportSuccess("Proposal downloaded.");
    } catch (error) {
      if (error instanceof ApiClientError) {
        setExportError(error);
      } else {
        setExportError(new ApiClientError(500, "Something went wrong. Please try again."));
      }
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton variant="page" lines={6} />;
  }

  if (schemaError) {
    return (
      <ErrorDisplay
        title="Proposal schema mismatch"
        message={schemaError}
        secondaryAction={{ label: "Back to Dashboard", onClick: () => router.push("/dashboard") }}
      />
    );
  }

  if (loadError || !proposal) {
    if (loadError?.status === 404) {
      return (
        <ErrorDisplay
          message="This proposal was not found."
          secondaryAction={{ label: "Back to Dashboard", onClick: () => router.push("/dashboard") }}
        />
      );
    }
    if (loadError?.status === 403) {
      return (
        <ErrorDisplay
          message="You don't have access to this proposal."
          secondaryAction={{ label: "Back to Dashboard", onClick: () => router.push("/dashboard") }}
        />
      );
    }
    return (
      <ErrorDisplay
        error={loadError}
        secondaryAction={{ label: "Back to Dashboard", onClick: () => router.push("/dashboard") }}
      />
    );
  }

  return (
    <section className="space-y-6">
      <div className="card space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <h3>{proposal.opportunity_title?.trim() ? proposal.opportunity_title : "Untitled opportunity"}</h3>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label={proposal.status} tone={getProposalStatusTone(proposal.status)} />
              <p className="text-sm text-secondary">
                Version {proposal.version} · {Math.min(proposal.regeneration_count, REGEN_MAX)} of {REGEN_MAX} regenerations used
              </p>
              {isFreePlan ? (
                <span className="rounded-full border border-brand-warning/40 bg-brand-warning/10 px-2 py-1 text-xs font-semibold text-brand-warning">
                  Evaluation Copy
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="h-11 rounded-[8px] border border-brand-border px-4 text-sm font-semibold" onClick={() => setExportOpen(true)}>
              Export Proposal
            </button>
            {!isFreePlan && regenRemaining > 0 ? (
              <button type="button" className="btn-primary" onClick={() => void runRegeneration()} disabled={regenLoading}>
                {regenLoading ? "Regenerating..." : "Regenerate Proposal"}
              </button>
            ) : null}
          </div>
        </div>

        {isFreePlan ? (
          <div className="rounded-[8px] border border-brand-warning/30 bg-brand-warning/5 p-3 text-sm">
            <p className="text-secondary">Regeneration isn&apos;t available on the Free plan.</p>
            <Link href="/billing" className="mt-2 inline-flex items-center font-semibold text-brand-primary hover:underline">
              Upgrade plan
            </Link>
          </div>
        ) : regenRemaining > 0 ? (
          <p className="text-sm text-secondary">Regenerations remaining: {regenRemaining}</p>
        ) : (
          <p className="text-sm text-secondary">You&apos;ve used all 3 regenerations for this proposal.</p>
        )}

        {regenError ? <ErrorDisplay error={regenError} /> : null}
        {exportError ? <ErrorDisplay error={exportError} /> : null}
        {exportSuccess ? <p className="text-sm font-medium text-brand-success">{exportSuccess}</p> : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <SectionNav
          sections={proposal.content_json.sections}
          activeSectionId={activeSectionId}
          onSelect={(id) => setActiveSectionId(id)}
        />
        {selectedSection ? <SectionContent section={selectedSection} /> : <LoadingSkeleton lines={2} />}
      </div>

      <div className="card space-y-2 text-sm text-secondary">
        <p>
          {proposal.content_json.generation_summary.generated} of {proposal.content_json.generation_summary.total_items} sections generated
          {proposal.content_json.generation_summary.failed > 0
            ? ` · ${proposal.content_json.generation_summary.failed} failed`
            : ""}
          {proposal.content_json.generation_summary.manual_required > 0
            ? ` · ${proposal.content_json.generation_summary.manual_required} require manual input`
            : ""}
        </p>
        {proposal.content_json.generation_summary.warnings.map((warning, index) => (
          <p key={index}>Warning: {warning}</p>
        ))}
      </div>

      <ExportModal
        isOpen={exportOpen}
        isExporting={exportLoading}
        summary={exportSummary}
        onCancel={() => setExportOpen(false)}
        onConfirm={() => void runExport()}
      />
    </section>
  );
}
