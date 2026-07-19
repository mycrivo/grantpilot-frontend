"use client";

import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";

import { Gate1ReviewFacts } from "@/components/reports/gate1/Gate1ReviewFacts";
import { ReportNotFound } from "@/components/reports/ReportNotFound";
import { ReportsFunnelHeader } from "@/components/reports/ReportsFunnelHeader";
import { ReportsJourneySteps } from "@/components/reports/ReportsJourneySteps";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import {
  confirmGate1,
  getKnowledgeBank,
  listReportDocuments,
  patchKnowledgeBank,
  promoteGate1,
  type KnowledgeBankResponse,
} from "@/lib/api/reports";
import { ApiClientError } from "@/lib/api-client";
import {
  resolveFriendlyApiErrorMessage,
  resolveGate1SaveErrorMessage,
} from "@/lib/me-error-messages";
import { buildUserAddedFactPayload } from "@/lib/knowledge-bank-view";
import {
  buildGate1LayoutView,
  buildGate1ReviewClusters,
  type Gate1ReviewClusterId,
} from "@/lib/knowledge-bank-gate1-layout";
import { useReportSubpathGuard } from "@/lib/report-subpath-guard";

type FactsReportPageProps = {
  params: Promise<{ id: string }>;
};

export default function FactsReportPage({ params }: FactsReportPageProps) {
  const { id: reportId } = use(params);
  const router = useRouter();
  const guard = useReportSubpathGuard(reportId, "facts");
  const [knowledgeBank, setKnowledgeBank] = useState<KnowledgeBankResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reviewedClusterIds, setReviewedClusterIds] = useState<Set<Gate1ReviewClusterId>>(new Set());
  const [reviewingClusterId, setReviewingClusterId] = useState<Gate1ReviewClusterId | null>(null);
  const [documentFilenameById, setDocumentFilenameById] = useState<Record<string, string>>({});

  const loadKnowledgeBank = useCallback(async () => {
    const bank = await getKnowledgeBank(reportId);
    setKnowledgeBank(bank);
    setError(null);
    return bank;
  }, [reportId]);

  useEffect(() => {
    if (!guard.allowed) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const [bank, documents] = await Promise.all([
          loadKnowledgeBank(),
          listReportDocuments(reportId),
        ]);
        if (!cancelled && bank) {
          setKnowledgeBank(bank);
          setDocumentFilenameById(
            Object.fromEntries(documents.documents.map((doc) => [doc.id, doc.original_filename])),
          );
        }
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        if (loadError instanceof ApiClientError && loadError.status === 404) {
          setNotFound(true);
          return;
        }

        setError(
          loadError instanceof ApiClientError
            ? loadError
            : new ApiClientError(500, "Failed to load project facts."),
        );
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [guard.allowed, loadKnowledgeBank]);

  const refreshAfterPatch = async () => {
    const bank = await getKnowledgeBank(reportId);
    setKnowledgeBank(bank);
    return bank;
  };

  const resolveSaveErrorMessage = (patchError: unknown, fallback: string) =>
    patchError instanceof ApiClientError
      ? resolveGate1SaveErrorMessage(patchError)
      : fallback;

  const handleSaveFact = async (factKey: string, value: string) => {
    setSaving(true);
    setConfirmError(null);
    setSaveError(null);
    try {
      await patchKnowledgeBank(reportId, {
        facts: {
          [factKey]: {
            value,
            confirmed: true,
          },
        },
      });
      await refreshAfterPatch();
    } catch (patchError) {
      setSaveError(resolveSaveErrorMessage(patchError, "Failed to save fact."));
    } finally {
      setSaving(false);
    }
  };

  const handleResolveConflict = async (factKey: string, resolvedValue: unknown) => {
    setSaving(true);
    setConfirmError(null);
    setSaveError(null);
    try {
      await patchKnowledgeBank(reportId, {
        conflict_resolutions: [{ fact_key: factKey, resolved_value: resolvedValue }],
      });
      await refreshAfterPatch();
    } catch (patchError) {
      setSaveError(resolveSaveErrorMessage(patchError, "Failed to save conflict resolution."));
    } finally {
      setSaving(false);
    }
  };

  const handleAddFact = async (label: string, value: string, sourceLabel: string) => {
    setSaving(true);
    setConfirmError(null);
    setSaveError(null);
    const factKey = `user_fact_${Date.now()}`;
    try {
      await patchKnowledgeBank(reportId, {
        facts: {
          [factKey]: {
            value,
            confirmed: true,
          },
        },
      });
      const bank = await refreshAfterPatch();
      setKnowledgeBank({
        ...bank,
        facts: {
          ...bank.facts,
          [factKey]: buildUserAddedFactPayload(label, value, sourceLabel),
        },
      });
    } catch (patchError) {
      setSaveError(resolveSaveErrorMessage(patchError, "Failed to add fact."));
    } finally {
      setSaving(false);
    }
  };

  const handleResolveClientConflict = async (factKeys: string[], resolvedValue: string) => {
    setSaving(true);
    setConfirmError(null);
    setSaveError(null);
    try {
      const facts: Record<string, { value: string; confirmed: boolean }> = {};
      for (const factKey of factKeys) {
        facts[factKey] = { value: resolvedValue, confirmed: true };
      }
      await patchKnowledgeBank(reportId, { facts });
      await refreshAfterPatch();
    } catch (patchError) {
      setSaveError(resolveSaveErrorMessage(patchError, "Failed to save conflict resolution."));
    } finally {
      setSaving(false);
    }
  };

  const handleClusterReview = async (clusterId: Gate1ReviewClusterId) => {
    if (!knowledgeBank) {
      return;
    }

    setReviewingClusterId(clusterId);
    setConfirmError(null);

    try {
      const latest = await getKnowledgeBank(reportId);
      const layout = buildGate1LayoutView(latest);
      const cluster = buildGate1ReviewClusters(layout).find((entry) => entry.clusterId === clusterId);
      if (!cluster) {
        return;
      }

      const rawFacts = (latest.knowledge_bank_json?.facts ?? latest.facts) as Record<string, unknown>;
      if (cluster.needsPromotionKeys.length > 0) {
        const promoteFactKeys = cluster.needsPromotionKeys.map((factKey) => {
          const raw = rawFacts[factKey] as Record<string, unknown> | undefined;
          return {
            fact_key: factKey,
            confirmed_value_snapshot: raw?.value ?? null,
          };
        });
        await promoteGate1(reportId, {
          promote_fact_keys: promoteFactKeys,
          cluster_id: clusterId,
        });
        await refreshAfterPatch();
      }

      setReviewedClusterIds((current) => new Set([...current, clusterId]));
    } catch (reviewError) {
      setConfirmError(
        reviewError instanceof ApiClientError
          ? resolveFriendlyApiErrorMessage(reviewError, "Failed to save cluster review. Please try again.")
          : "Failed to save cluster review. Please try again.",
      );
    } finally {
      setReviewingClusterId(null);
    }
  };

  const handleContinue = async () => {
    if (!knowledgeBank) {
      return;
    }

    setConfirming(true);
    setConfirmError(null);

    try {
      const latest = await getKnowledgeBank(reportId);
      const baseJson = latest.knowledge_bank_json ?? {};
      const payload = {
        ...baseJson,
        facts: knowledgeBank.facts,
        conflicts: latest.conflicts,
      };

      await confirmGate1(reportId, { knowledge_bank_json: payload });
      router.replace(`/reports/${encodeURIComponent(reportId)}`);
    } catch (confirmErr) {
      setConfirmError(
        confirmErr instanceof ApiClientError
          ? resolveFriendlyApiErrorMessage(confirmErr, "Failed to confirm facts. Please try again.")
          : "Failed to confirm facts. Please try again.",
      );
      setConfirming(false);
    }
  };

  if (guard.notFound) {
    return <ReportNotFound />;
  }

  if (guard.error) {
    return <ErrorDisplay title="Project facts unavailable" error={guard.error} />;
  }

  if (guard.loading || !guard.allowed) {
    return <LoadingSkeleton variant="page" lines={8} />;
  }

  if (notFound) {
    return <ReportNotFound />;
  }

  if (error) {
    return <ErrorDisplay title="Project facts unavailable" error={error} />;
  }

  if (!knowledgeBank) {
    return <LoadingSkeleton variant="page" lines={8} />;
  }

  return (
    <section className="space-y-6">
      <ReportsFunnelHeader />
      <ReportsJourneySteps current="facts" />
      <Gate1ReviewFacts
        knowledgeBank={knowledgeBank}
        saving={saving}
        confirming={confirming}
        confirmError={confirmError}
        saveError={saveError}
        onDismissSaveError={() => setSaveError(null)}
        reviewedClusterIds={reviewedClusterIds}
        reviewingClusterId={reviewingClusterId}
        onSaveFact={handleSaveFact}
        onResolveConflict={handleResolveConflict}
        onResolveClientConflict={handleResolveClientConflict}
        onAddFact={handleAddFact}
        onClusterReview={handleClusterReview}
        onContinue={handleContinue}
        documentFilenameById={documentFilenameById}
      />
    </section>
  );
}
