/**
 * CSV download helpers.
 *
 * - Normal browser (top window): POST CSV → blob → same-tab download (no new tab).
 * - Sandboxed / cross-origin iframe: token + new tab (anchor.click blocked).
 * - Same-origin parent iframe: postMessage → parent runs same-tab download.
 */

export const ASYMMETRIX_DOWNLOAD_CSV_MESSAGE = "ASYMMETRIX_DOWNLOAD_CSV";

const DOWNLOAD_CSV_API = "/api/download-csv";

export type DownloadCsvMessage = {
  type: typeof ASYMMETRIX_DOWNLOAD_CSV_MESSAGE;
  content: string;
  filename: string;
};

export function isInIframe(): boolean {
  return typeof window !== "undefined" && window.self !== window.top;
}

export function isSandboxedWithoutDownloads(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const frame = window.frameElement as HTMLIFrameElement | null;
    if (!frame?.hasAttribute("sandbox")) return false;
    const tokens = (frame.getAttribute("sandbox") ?? "")
      .split(/\s+/)
      .filter(Boolean);
    if (tokens.length === 0) return true;
    return !tokens.includes("allow-downloads");
  } catch {
    return isInIframe();
  }
}

/** Needs new-tab flow (sandboxed embed / IDE preview). */
export function shouldUseNewTabDownload(): boolean {
  return isInIframe() || isSandboxedWithoutDownloads();
}

function sanitizeFilename(name: string): string {
  const trimmed = name.trim() || "export.csv";
  return trimmed.toLowerCase().endsWith(".csv") ? trimmed : `${trimmed}.csv`;
}

function canReachSameOriginParent(): boolean {
  if (!isInIframe()) return false;
  try {
    return window.parent.location.origin === window.location.origin;
  } catch {
    return false;
  }
}

/** Same-tab download via server POST (no new tab). */
async function downloadCsvInPlace(
  content: string,
  filename: string
): Promise<void> {
  const response = await fetch(DOWNLOAD_CSV_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content,
      filename: sanitizeFilename(filename),
      prepare: false,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "");
    throw new Error(`Download failed (${response.status}): ${err}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = sanitizeFilename(filename);
  anchor.style.cssText = "position:fixed;opacity:0;pointer-events:none;";
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 200);
}

async function prepareDownloadToken(
  content: string,
  filename: string
): Promise<string> {
  const response = await fetch(DOWNLOAD_CSV_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content,
      filename: sanitizeFilename(filename),
      prepare: true,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "");
    throw new Error(`Download prepare failed (${response.status}): ${err}`);
  }

  const data = (await response.json()) as { token?: string };
  if (!data.token) {
    throw new Error("Download prepare returned no token");
  }
  return data.token;
}

/** New tab — only for embedded/sandboxed contexts where same-tab anchor is blocked. */
function openCsvDownloadByToken(token: string): void {
  if (typeof document === "undefined" || !token) return;

  const url = `${DOWNLOAD_CSV_API}?token=${encodeURIComponent(token)}`;
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (opened) return;

  const form = document.createElement("form");
  form.method = "GET";
  form.action = DOWNLOAD_CSV_API;
  form.target = "_blank";

  const tokenInput = document.createElement("input");
  tokenInput.type = "hidden";
  tokenInput.name = "token";
  tokenInput.value = token;
  form.appendChild(tokenInput);

  document.body.appendChild(form);
  form.submit();
  setTimeout(() => form.remove(), 1000);
}

async function downloadCsvViaNewTab(
  content: string,
  filename: string
): Promise<void> {
  const token = await prepareDownloadToken(content, sanitizeFilename(filename));
  openCsvDownloadByToken(token);
}

export function requestParentDownload(content: string, filename: string): void {
  if (!isInIframe()) return;
  const message: DownloadCsvMessage = {
    type: ASYMMETRIX_DOWNLOAD_CSV_MESSAGE,
    content,
    filename: sanitizeFilename(filename),
  };
  try {
    window.parent.postMessage(message, "*");
  } catch {
    // ignore
  }
}

export async function downloadFile(
  content: string | Blob,
  filename: string
): Promise<void> {
  const text = content instanceof Blob ? await content.text() : content;
  const safeFilename = sanitizeFilename(filename);

  if (canReachSameOriginParent()) {
    requestParentDownload(text, safeFilename);
    return;
  }

  if (shouldUseNewTabDownload()) {
    await downloadCsvViaNewTab(text, safeFilename);
    return;
  }

  await downloadCsvInPlace(text, safeFilename);
}

export function isDownloadCsvMessage(data: unknown): data is DownloadCsvMessage {
  if (!data || typeof data !== "object") return false;
  const msg = data as Record<string, unknown>;
  return (
    msg.type === ASYMMETRIX_DOWNLOAD_CSV_MESSAGE &&
    typeof msg.content === "string" &&
    typeof msg.filename === "string"
  );
}

export async function downloadCsvFromMessage(
  content: string,
  filename: string
): Promise<void> {
  await downloadCsvInPlace(content, sanitizeFilename(filename));
}
