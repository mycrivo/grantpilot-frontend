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
  patchKnowledgeBank,
  type KnowledgeBankResponse,
} from "@/lib/api/reports";
import { ApiClientError } from "@/lib/api-client";
import { resolveFriendlyApiErrorMessage } from "@/lib/me-error-messages";
import { buildUserAddedFactPayload } from "@/lib/knowledge-bank-view";
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
        const bank = await loadKnowledgeBank();
        if (!cancelled && bank) {
          setKnowledgeBank(bank);
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

  const handleSaveFact = async (factKey: string, value: string) => {
    setSaving(true);
    setConfirmError(null);
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
      setError(
        patchError instanceof ApiClientError
          ? patchError
          : new ApiClientError(500, "Failed to save fact."),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleResolveConflict = async (factKey: string, resolvedValue: unknown) => {
    setSaving(true);
    setConfirmError(null);
    try {
      await patchKnowledgeBank(reportId, {
        conflict_resolutions: [{ fact_key: factKey, resolved_value: resolvedValue }],
      });
      await refreshAfterPatch();
    } catch (patchError) {
      setError(
        patchError instanceof ApiClientError
          ? patchError
          : new ApiClientError(500, "Failed to save conflict resolution."),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAddFact = async (label: string, value: string, sourceLabel: string) => {
    setSaving(true);
    setConfirmError(null);
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
      setError(
        patchError instanceof ApiClientError
          ? patchError
          : new ApiClientError(500, "Failed to add fact."),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
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
        onSaveFact={handleSaveFact}
        onResolveConflict={handleResolveConflict}
        onAddFact={handleAddFact}
        onConfirm={handleConfirm}
      />
    </section>
  );
}
