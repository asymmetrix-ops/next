"use client";

import type { XanoStoredFile } from "@/lib/contributorCrm/api";

const XANO_FILE_BASE_URL = "https://xdil-abvj-o7rq.e2.xano.io";

function getDocumentUrl(document: XanoStoredFile): string | null {
  if (typeof document.url === "string" && document.url.trim() !== "") {
    return document.url;
  }
  if (typeof document.path === "string" && document.path.startsWith("/")) {
    return `${XANO_FILE_BASE_URL}${document.path}`;
  }
  return null;
}

function formatFileSize(size: number | undefined): string | null {
  if (typeof size !== "number" || !Number.isFinite(size) || size < 0) {
    return null;
  }

  if (size < 1024) return `${size} B`;

  const units = ["KB", "MB", "GB"];
  let value = size / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const digits = value >= 10 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

function getDocumentTypeLabel(document: XanoStoredFile): string {
  if (typeof document.type === "string" && document.type.trim() !== "") {
    return document.type.toUpperCase();
  }
  if (typeof document.mime === "string" && document.mime.trim() !== "") {
    return document.mime;
  }
  return "FILE";
}

type RequestDocumentsSectionProps = {
  documents?: XanoStoredFile[];
};

export function RequestDocumentsSection({
  documents = [],
}: RequestDocumentsSectionProps) {
  if (documents.length === 0) return null;

  return (
    <div className="rounded-lg border border-[#222] bg-[#111] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-[#60a5fa]">
            Supporting Documents
          </div>
          <div className="mt-1 text-xs text-[#777]">
            {documents.length} file{documents.length !== 1 ? "s" : ""} attached to this request
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {documents.map((document, index) => {
          const url = getDocumentUrl(document);
          const fileSize = formatFileSize(document.size);

          return (
            <div
              key={`${document.path}-${index}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#1f1f1f] bg-[#171717] px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-white">
                  {document.name || `Document ${index + 1}`}
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-[#888]">
                  <span>{getDocumentTypeLabel(document)}</span>
                  {fileSize && <span>{fileSize}</span>}
                  {typeof document.mime === "string" && document.mime.trim() !== "" && (
                    <span>{document.mime}</span>
                  )}
                </div>
              </div>

              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-[#2b6cb0] bg-[#0f2745] px-3 py-1.5 text-xs font-medium text-[#93c5fd] hover:bg-[#133259]"
                >
                  Open
                </a>
              ) : (
                <span className="text-xs text-[#666]">No link</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
