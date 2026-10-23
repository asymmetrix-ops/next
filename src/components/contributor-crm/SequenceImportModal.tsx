"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import {
  createDcpOutreachEmailContent,
  importOutreachRows,
} from "@/lib/contributorCrm/api";
import { authService } from "@/lib/contributorCrm/auth";
import { buildBrandedEmailHtmlFromPlainText } from "@/lib/contributorCrm/email";
import {
  OUTREACH_IMPORT_COLUMNS,
  parseOutreachImportFile,
  type OutreachImportRow,
  type ParsedEmailTemplate,
} from "@/lib/contributorCrm/outreachImport";

type SequenceImportModalProps = {
  onClose: () => void;
  onImported?: () => void;
};

export function SequenceImportModal({
  onClose,
  onImported,
}: SequenceImportModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<OutreachImportRow[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<ParsedEmailTemplate[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFile = useCallback(async (file: File | null | undefined) => {
    if (!file) return;

    setParsing(true);
    setParseError(null);
    setFileName(file.name);
    setRows([]);
    setEmailTemplates([]);

    try {
      const parsed = await parseOutreachImportFile(file);
      setRows(parsed.rows);
      setEmailTemplates(parsed.emailTemplates);
    } catch (error) {
      setParseError((error as Error).message || "Failed to parse file");
      setRows([]);
      setEmailTemplates([]);
    } finally {
      setParsing(false);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    const token = authService.getAuthToken();
    if (!token) {
      toast.error("Authentication required");
      return;
    }
    if (rows.length === 0) {
      toast.error("Upload a file with at least one valid row");
      return;
    }

    setSubmitting(true);
    try {
      for (const template of emailTemplates) {
        await createDcpOutreachEmailContent(token, {
          Publication_Date: template.publication_date,
          Headline: template.headline,
          Body: buildBrandedEmailHtmlFromPlainText({
            bodyText: template.body,
            subject: template.headline,
          }),
          from_email: template.from_email,
          round: template.round,
        });
      }

      await importOutreachRows(token, rows);

      const templateMsg =
        emailTemplates.length > 0
          ? ` and ${emailTemplates.length} email template${emailTemplates.length === 1 ? "" : "s"}`
          : "";
      toast.success(`Imported ${rows.length} row${rows.length === 1 ? "" : "s"}${templateMsg}`);
      onImported?.();
      onClose();
    } catch (error) {
      toast.error((error as Error).message || "Failed to import sequence");
    } finally {
      setSubmitting(false);
    }
  }, [emailTemplates, onClose, onImported, rows]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sequence-import-title"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2
              id="sequence-import-title"
              className="text-sm font-semibold text-gray-900"
            >
              Import outreach sequence
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Drop an Excel file with company rows and a Body tab for Round 1/2/3 copy.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <div
            className={`rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
              dragActive
                ? "border-blue-400 bg-blue-50"
                : "border-gray-200 bg-gray-50"
            }`}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setDragActive(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              const file = event.dataTransfer.files?.[0];
              void handleFile(file);
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                void handleFile(file);
                event.target.value = "";
              }}
            />
            <p className="text-sm text-gray-700">
              {fileName ? fileName : "Drag and drop a file here"}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Excel (.xlsx) with Company Analysis List + Body tabs, or CSV
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={parsing || submitting}
              className="mt-4 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              Choose file
            </button>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
              Expected company columns
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {OUTREACH_IMPORT_COLUMNS.map((column) => (
                <span
                  key={column}
                  className="rounded border border-gray-200 bg-white px-2 py-0.5 font-mono text-[10px] text-gray-600"
                >
                  {column}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-gray-500">
              The Body tab should include Round 1, Round 2, and Round 3 columns. Date columns
              accept timestamps, Excel dates, or readable date strings.
            </p>
          </div>

          {parsing && (
            <div className="text-xs text-gray-500">Parsing file…</div>
          )}

          {parseError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {parseError}
            </div>
          )}

          {emailTemplates.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-gray-600">
                Parsed{" "}
                <span className="font-medium text-gray-900">
                  {emailTemplates.length}
                </span>{" "}
                email template{emailTemplates.length === 1 ? "" : "s"} from Body tab.
              </div>
              <div className="space-y-2">
                {emailTemplates.map((template) => (
                  <div
                    key={template.round}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                  >
                    <div className="text-[11px] font-medium text-gray-800">
                      {template.headline}
                    </div>
                    <div className="mt-1 line-clamp-3 whitespace-pre-wrap text-[10px] text-gray-500">
                      {template.body}
                    </div>
                    <div className="mt-1 text-[10px] text-gray-400">
                      Run date: {template.publication_date}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {rows.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs text-gray-600">
                Parsed <span className="font-medium text-gray-900">{rows.length}</span>{" "}
                row{rows.length === 1 ? "" : "s"} ready to import.
              </div>
              <pre className="max-h-56 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-[10px] leading-relaxed text-gray-700">
                {JSON.stringify({ rows: rows.slice(0, 3) }, null, 2)}
                {rows.length > 3 ? "\n..." : ""}
              </pre>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || parsing || rows.length === 0}
            className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
          >
            {submitting ? "Importing…" : "Import sequence"}
          </button>
        </div>
      </div>
    </div>
  );
}
