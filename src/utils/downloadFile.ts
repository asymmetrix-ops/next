/**
 * Download a text/blob file in the browser.
 *
 * Programmatic downloads (anchor.download + click) fail inside a sandboxed
 * iframe without `allow-downloads`. Next.js does not add sandbox itself —
 * the parent embed (preview panel, admin shell, WebView) does.
 *
 * When embedded (`window.self !== window.top`), open the blob in a new tab so
 * the user can save it (File → Save, or browser download UI).
 */
export function downloadFile(
  content: string | Blob,
  filename: string,
  mimeType = "text/csv;charset=utf-8;"
): void {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const inIframe =
    typeof window !== "undefined" && window.self !== window.top;

  if (inIframe) {
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      try {
        (window.top ?? window).open(url, "_blank", "noopener,noreferrer");
      } catch {
        if (typeof content === "string") {
          window.open(
            `data:${mimeType},${encodeURIComponent(content)}`,
            "_blank",
            "noopener,noreferrer"
          );
        }
      }
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.cssText = "position:fixed;opacity:0;pointer-events:none;";
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 200);
}
