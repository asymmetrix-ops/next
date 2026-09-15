/**
 * PDF download helper — works around mobile Chrome (incl. Pixel) ignoring
 * cross-origin `download` and flaky programmatic blob saves.
 */

const PDF_MIME = "application/pdf";

export function sanitizePdfFilename(name: string): string {
  const base = String(name || "document")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  const withExt = base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
  return withExt || "document.pdf";
}

function triggerAnchorDownload(href: string, filename: string): void {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.style.cssText = "position:fixed;left:-9999px;opacity:0;pointer-events:none;";
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    try {
      document.body.removeChild(anchor);
    } catch {
      // ignore
    }
  }, 500);
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const typed =
    blob.type && blob.type !== "application/octet-stream"
      ? blob
      : new Blob([blob], { type: PDF_MIME });
  const objectUrl = URL.createObjectURL(typed);
  triggerAnchorDownload(objectUrl, filename);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 3000);
}

function isLikelyMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android|iPhone|iPad|iPod/i.test(ua);
}

async function tryWebSharePdf(blob: Blob, filename: string): Promise<boolean> {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false;
  }
  try {
    const file = new File([blob], filename, { type: PDF_MIME });
    if (navigator.canShare && !navigator.canShare({ files: [file] })) {
      return false;
    }
    await navigator.share({ files: [file], title: filename });
    return true;
  } catch {
    return false;
  }
}

async function fetchPdfBlob(url: string): Promise<Blob> {
  const res = await fetch(url, { mode: "cors", credentials: "omit" });
  if (!res.ok) {
    throw new Error(`PDF fetch failed (${res.status})`);
  }
  const blob = await res.blob();
  if (blob.type && blob.type !== "application/octet-stream") {
    return blob;
  }
  return new Blob([await blob.arrayBuffer()], { type: PDF_MIME });
}

/**
 * Download or open a PDF. For blob: URLs the anchor click runs synchronously
 * when possible so Android keeps the user-gesture context.
 */
export async function downloadPdfFromUrl(
  pdfUrl: string,
  filename: string
): Promise<void> {
  const safeName = sanitizePdfFilename(filename);
  if (!pdfUrl) return;

  if (pdfUrl.startsWith("blob:")) {
    if (isLikelyMobile()) {
      try {
        const blob = await fetchPdfBlob(pdfUrl);
        const shared = await tryWebSharePdf(blob, safeName);
        if (shared) return;
        triggerBlobDownload(blob, safeName);
        return;
      } catch {
        triggerAnchorDownload(pdfUrl, safeName);
        return;
      }
    }
    triggerAnchorDownload(pdfUrl, safeName);
    return;
  }

  if (!/^https?:\/\//i.test(pdfUrl)) {
    triggerAnchorDownload(pdfUrl, safeName);
    return;
  }

  // Cross-origin https — `download` is ignored on many mobile browsers; fetch first.
  let popup: Window | null = null;
  if (isLikelyMobile()) {
    try {
      popup = window.open("", "_blank");
    } catch {
      popup = null;
    }
  }

  try {
    const blob = await fetchPdfBlob(pdfUrl);
    if (popup && !popup.closed) {
      try {
        popup.close();
      } catch {
        // ignore
      }
    }

    if (isLikelyMobile()) {
      const shared = await tryWebSharePdf(blob, safeName);
      if (shared) return;
    }

    triggerBlobDownload(blob, safeName);
  } catch {
    if (popup && !popup.closed) {
      try {
        popup.location.href = pdfUrl;
        return;
      } catch {
        // ignore
      }
    }
    const opened = window.open(pdfUrl, "_blank", "noopener,noreferrer");
    if (!opened) {
      triggerAnchorDownload(pdfUrl, safeName);
    }
  }
}
