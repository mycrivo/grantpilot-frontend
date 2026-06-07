"use client";

import { useRef, useState } from "react";

import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import { uploadReportDocument, type UploadedDocumentResponse } from "@/lib/api/reports";
import { documentClassificationLabel } from "@/lib/document-classification-labels";
import { ApiClientError } from "@/lib/api-client";

type LocalUploadRow = {
  key: string;
  filename: string;
  status: "uploading" | "uploaded" | "failed" | "removed";
  document?: UploadedDocumentResponse;
  error?: ApiClientError;
};

type ReportDocumentUploadProps = {
  reportId: string;
  onUploadedCountChange: (count: number) => void;
};

export function ReportDocumentUpload({ reportId, onUploadedCountChange }: ReportDocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<LocalUploadRow[]>([]);
  const [actionError, setActionError] = useState<ApiClientError | null>(null);

  const syncUploadedCount = (nextRows: LocalUploadRow[]) => {
    const count = nextRows.filter((row) => row.status === "uploaded").length;
    onUploadedCountChange(count);
  };

  const uploadFile = async (file: File) => {
    const key = `${file.name}-${file.size}-${file.lastModified}`;
    setRows((current) => {
      const next = [...current, { key, filename: file.name, status: "uploading" as const }];
      syncUploadedCount(next);
      return next;
    });
    setActionError(null);

    try {
      const document = await uploadReportDocument(reportId, file);
      setRows((current) => {
        const next = current.map((row) =>
          row.key === key ? { ...row, status: "uploaded" as const, document, error: undefined } : row,
        );
        syncUploadedCount(next);
        return next;
      });
    } catch (error) {
      const apiError =
        error instanceof ApiClientError ? error : new ApiClientError(500, "The file could not be uploaded. Please try again.");
      setRows((current) => {
        const next = current.map((row) =>
          row.key === key ? { ...row, status: "failed" as const, error: apiError } : row,
        );
        syncUploadedCount(next);
        return next;
      });
      setActionError(apiError);
    }
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) {
      return;
    }
    void Promise.all(Array.from(fileList).map((file) => uploadFile(file)));
  };

  const visibleRows = rows.filter((row) => row.status !== "removed");

  return (
    <div className="space-y-4">
      <label
        htmlFor="report-document-input"
        className="block cursor-pointer rounded-[12px] border border-dashed border-brand-border bg-brand-card-bg px-6 py-8 text-center hover:border-brand-primary hover:bg-brand-primary/5"
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[12px] bg-brand-primary/10 text-2xl text-brand-primary">
          ↥
        </div>
        <p className="font-semibold text-brand-text-primary">Drag files here, or browse</p>
        <p className="mt-1 text-sm text-secondary">Word, PDF, Excel, CSV, PowerPoint, and images</p>
        <input
          id="report-document-input"
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </label>

      {visibleRows.length > 0 ? (
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-neutral">Your documents</p>
          <ul className="space-y-2">
            {visibleRows.map((row) => (
              <li
                key={row.key}
                className="flex items-center gap-3 rounded-[8px] border border-brand-border bg-brand-card-bg px-4 py-3"
              >
                <span aria-hidden="true" className="text-brand-primary">
                  ▦
                </span>
                <span className="min-w-0 flex-1 truncate font-medium text-brand-text-primary">{row.filename}</span>
                <span className="text-sm capitalize text-secondary">
                  {row.status === "uploading"
                    ? "Uploading…"
                    : row.status === "failed"
                      ? "Upload failed"
                      : documentClassificationLabel(row.document?.classification)}
                </span>
                <button
                  type="button"
                  className="rounded-[6px] px-2 py-1 text-lg leading-none text-secondary hover:bg-brand-divider hover:text-brand-text-primary"
                  aria-label={`Remove ${row.filename}`}
                  onClick={() => {
                    setRows((current) => {
                      const next = current.map((item) =>
                        item.key === row.key ? { ...item, status: "removed" as const } : item,
                      );
                      syncUploadedCount(next);
                      return next;
                    });
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="flex items-start gap-2 rounded-[6px] border border-brand-border bg-brand-primary/5 px-4 py-3 text-sm text-secondary">
        <span aria-hidden="true" className="text-brand-primary">
          ⛨
        </span>
        <span>Messy files are fine. You will review the important facts before anything goes into your report.</span>
      </p>

      {actionError ? <ErrorDisplay error={actionError} /> : null}
    </div>
  );
}
