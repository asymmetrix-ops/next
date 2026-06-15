"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  html: string;
  onChangeHtml: (html: string) => void;
  onUploadImage?: (file: File) => Promise<string>;
  minHeightPx?: number;
};

// Styles injected into the iframe to show replaceable targets
const IFRAME_INJECT_CSS = `
  img[data-replaceable],
  [data-replaceable] {
    cursor: pointer !important;
    transition: outline 0.1s;
  }
  img[data-replaceable]:hover,
  [data-replaceable]:hover {
    outline: 2px dashed #3b82f6 !important;
    outline-offset: 2px;
  }
  img[data-replaceable].ee-selected,
  [data-replaceable].ee-selected {
    outline: 2px solid #3b82f6 !important;
    outline-offset: 2px;
  }
`;

function isPlaceholderElement(el: Element): boolean {
  const text = (el.textContent ?? "").toLowerCase();
  return text.includes("add screenshot") || text.includes("screenshot") && text.includes("replace");
}

function formatDoctype(doc: Document): string {
  const dt = doc.doctype;
  return dt
    ? `<!DOCTYPE ${dt.name}${dt.publicId ? ` PUBLIC "${dt.publicId}"` : ""}${
        dt.systemId ? ` "${dt.systemId}"` : ""
      }>`
    : "<!doctype html>";
}

/** Serialize for persistence without mutating the live iframe (keeps focus/cursor). */
function serializeEmailDocumentForSave(doc: Document): string {
  const html = doc.documentElement.cloneNode(true) as HTMLElement;
  const body = html.querySelector("body");
  if (body) {
    body.removeAttribute("contenteditable");
    body.removeAttribute("spellcheck");
    body.style.removeProperty("outline");
  }
  html.querySelectorAll(".ee-selected").forEach((el) => {
    el.classList.remove("ee-selected");
  });
  html.querySelectorAll("style").forEach((styleEl) => {
    if (styleEl.textContent === IFRAME_INJECT_CSS) {
      styleEl.remove();
    }
  });
  return `${formatDoctype(doc)}\n${html.outerHTML}`;
}

type ToolbarBtnProps = {
  label: string;
  title?: string;
  active?: boolean;
  disabled?: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  className?: string;
};

function ToolbarBtn({ label, title, active, disabled, onMouseDown, className }: ToolbarBtnProps) {
  return (
    <button
      type="button"
      title={title ?? label}
      disabled={disabled}
      onMouseDown={onMouseDown}
      className={[
        "rounded px-2.5 py-1 text-sm font-medium transition-colors",
        active
          ? "bg-gray-800 text-white"
          : "text-gray-700 hover:bg-gray-100 disabled:opacity-40",
        className ?? "",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

export function ContentEditableEmailEditor({
  html,
  onChangeHtml,
  onUploadImage,
  minHeightPx = 560,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastEmittedRef = useRef(html);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSyncingRef = useRef(false);
  const teardownDocRef = useRef<(() => void) | null>(null);
  const onChangeHtmlRef = useRef(onChangeHtml);
  onChangeHtmlRef.current = onChangeHtml;
  const savedRangeRef = useRef<Range | null>(null);
  const replacementTargetRef = useRef<Element | null>(null);
  const [uploading, setUploading] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState<"image" | "placeholder" | null>(null);

  const [srcDoc, setSrcDoc] = useState(html);

  // Reload iframe only for external template loads — not for keystrokes (see TiptapSimpleEditor).
  useEffect(() => {
    if (html === lastEmittedRef.current) return;

    const doc = iframeRef.current?.contentDocument;
    if (doc?.documentElement) {
      const current = serializeEmailDocumentForSave(doc);
      if (current === html) {
        lastEmittedRef.current = html;
        return;
      }
    }

    lastEmittedRef.current = html;
    setSrcDoc(html);
  }, [html]);

  useEffect(() => {
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      teardownDocRef.current?.();
    };
  }, []);

  const syncFromIframe = useCallback(() => {
    if (isSyncingRef.current) return;
    const doc = iframeRef.current?.contentDocument;
    if (!doc?.documentElement) return;

    isSyncingRef.current = true;
    try {
      const serialized = serializeEmailDocumentForSave(doc);
      if (serialized === lastEmittedRef.current) return;
      lastEmittedRef.current = serialized;
      onChangeHtmlRef.current(serialized);
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  const saveSelection = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const sel = doc.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    const range = savedRangeRef.current;
    if (!doc || !range) return;
    doc.body.focus();
    const sel = doc.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, []);

  const clearReplaceTarget = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (doc) {
      doc.querySelectorAll(".ee-selected").forEach((el) => el.classList.remove("ee-selected"));
    }
    replacementTargetRef.current = null;
    setReplaceTarget(null);
  }, []);

  const setReplaceTargetEl = useCallback((el: Element, kind: "image" | "placeholder") => {
    clearReplaceTarget();
    replacementTargetRef.current = el;
    el.classList.add("ee-selected");
    setReplaceTarget(kind);
  }, [clearReplaceTarget]);

  const doUpload = useCallback(
    (onSuccess: (src: string) => void) => {
      if (!onUploadImage) {
        const url = window.prompt("Image URL", "https://");
        if (url?.trim()) onSuccess(url.trim());
        return;
      }
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
          const src = await onUploadImage(file);
          onSuccess(src);
        } catch (err) {
          alert(err instanceof Error ? err.message : "Image upload failed");
        } finally {
          setUploading(false);
        }
      };
      input.click();
    },
    [onUploadImage]
  );

  // Replace a targeted element (placeholder container or img) with an uploaded image
  const handleReplaceTarget = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const target = replacementTargetRef.current;
      doUpload((src) => {
        const doc = iframeRef.current?.contentDocument;
        if (!doc || !target || !doc.body.contains(target)) return;

        const img = doc.createElement("img");
        img.src = src;
        img.style.maxWidth = "100%";
        img.style.height = "auto";
        img.style.display = "block";
        img.setAttribute("data-replaceable", "image");
        img.classList.add("ee-selected");

        if (target.tagName === "IMG") {
          (target as HTMLImageElement).src = src;
          (target as HTMLImageElement).setAttribute("data-replaceable", "image");
          clearReplaceTarget();
          setReplaceTargetEl(target, "image");
        } else {
          // Replace the placeholder container with the image
          target.parentNode?.replaceChild(img, target);
          replacementTargetRef.current = img;
          setReplaceTarget("image");
        }
        syncFromIframe();
      });
    },
    [doUpload, clearReplaceTarget, setReplaceTargetEl, syncFromIframe]
  );

  // Insert image at cursor (no target selected)
  const handleInsertImage = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      saveSelection();
      doUpload((src) => {
        restoreSelection();
        const doc = iframeRef.current?.contentDocument;
        if (!doc) return;

        const range = savedRangeRef.current;
        const img = doc.createElement("img");
        img.src = src;
        img.style.maxWidth = "100%";
        img.style.height = "auto";
        img.style.display = "block";
        img.setAttribute("data-replaceable", "image");

        if (range) {
          range.deleteContents();
          range.insertNode(img);
          range.setStartAfter(img);
          range.collapse(true);
          const sel = doc.getSelection();
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
          }
        } else {
          doc.body.appendChild(img);
        }
        syncFromIframe();
      });
    },
    [doUpload, saveSelection, restoreSelection, syncFromIframe]
  );

  const execCmd = useCallback(
    (e: React.MouseEvent, command: string, value?: string) => {
      e.preventDefault();
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      restoreSelection();
      doc.execCommand(command, false, value ?? undefined);
      syncFromIframe();
    },
    [restoreSelection, syncFromIframe]
  );

  const handleInsertLink = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      saveSelection();
      const url = window.prompt("Link URL", "https://");
      if (!url?.trim()) return;
      restoreSelection();
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      doc.execCommand("createLink", false, url.trim());
      syncFromIframe();
    },
    [saveSelection, restoreSelection, syncFromIframe]
  );

  const handleLoad = useCallback(() => {
    teardownDocRef.current?.();

    const doc = iframeRef.current?.contentDocument;
    if (!doc?.body) return;

    // Make body editable
    doc.body.contentEditable = "true";
    doc.body.spellcheck = true;
    doc.body.style.outline = "none";

    // Inject hover styles
    const style = doc.createElement("style");
    style.textContent = IFRAME_INJECT_CSS;
    doc.head?.appendChild(style);

    // Mark all existing images as replaceable
    doc.querySelectorAll("img").forEach((img) => {
      img.setAttribute("data-replaceable", "image");
    });

    // Mark placeholder containers as replaceable
    doc.querySelectorAll("div, td, section, figure").forEach((el) => {
      if (isPlaceholderElement(el)) {
        el.setAttribute("data-replaceable", "placeholder");
      }
    });

    const onDocClick = (ev: MouseEvent) => {
      const target = ev.target as Element;

      // Direct img click
      if (target.tagName === "IMG") {
        ev.preventDefault();
        setReplaceTargetEl(target, "image");
        return;
      }

      // Walk up to find a replaceable ancestor
      let node: Element | null = target;
      while (node && node !== doc.body) {
        if (node.hasAttribute("data-replaceable")) {
          const kind =
            node.getAttribute("data-replaceable") === "image" ? "image" : "placeholder";
          setReplaceTargetEl(node, kind);
          return;
        }
        node = node.parentElement;
      }

      // Nothing replaceable clicked — clear target
      clearReplaceTarget();
    };

    const scheduleSync = () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(syncFromIframe, 200);
    };

    const onDocBlur = () => {
      if (isSyncingRef.current) return;
      syncFromIframe();
    };

    doc.addEventListener("click", onDocClick);
    doc.addEventListener("input", scheduleSync);
    doc.addEventListener("blur", onDocBlur, true);
    doc.addEventListener("selectionchange", saveSelection);
    doc.addEventListener("mouseup", saveSelection);
    doc.addEventListener("keyup", saveSelection);

    teardownDocRef.current = () => {
      doc.removeEventListener("click", onDocClick);
      doc.removeEventListener("input", scheduleSync);
      doc.removeEventListener("blur", onDocBlur, true);
      doc.removeEventListener("selectionchange", saveSelection);
      doc.removeEventListener("mouseup", saveSelection);
      doc.removeEventListener("keyup", saveSelection);
    };
  }, [syncFromIframe, saveSelection, setReplaceTargetEl, clearReplaceTarget]);

  const btnLabel = uploading
    ? "Uploading…"
    : replaceTarget === "placeholder"
    ? "📷 Replace screenshot"
    : replaceTarget === "image"
    ? "🔄 Replace image"
    : "📎 Insert image";

  return (
    <div className="overflow-hidden rounded border border-gray-300 bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b bg-gray-50 px-2 py-1.5">
        <ToolbarBtn label="B" title="Bold" onMouseDown={(e) => execCmd(e, "bold")} />
        <ToolbarBtn label="I" title="Italic" onMouseDown={(e) => execCmd(e, "italic")} />
        <ToolbarBtn label="U" title="Underline" onMouseDown={(e) => execCmd(e, "underline")} />
        <div className="mx-1 h-4 w-px bg-gray-300" />
        <ToolbarBtn label="Link" title="Insert link" onMouseDown={handleInsertLink} />
        <ToolbarBtn label="Unlink" title="Remove link" onMouseDown={(e) => execCmd(e, "unlink")} />
        <div className="mx-1 h-4 w-px bg-gray-300" />

        {replaceTarget ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={uploading}
              onMouseDown={handleReplaceTarget}
              className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {btnLabel}
            </button>
            <button
              type="button"
              title="Cancel selection"
              onMouseDown={(e) => { e.preventDefault(); clearReplaceTarget(); }}
              className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
            >
              ✕
            </button>
          </div>
        ) : (
          <ToolbarBtn
            label={uploading ? "Uploading…" : "📎 Insert image"}
            title="Upload image and insert at cursor"
            disabled={uploading}
            onMouseDown={handleInsertImage}
          />
        )}

        {replaceTarget && (
          <span className="ml-2 text-xs text-blue-600">
            {replaceTarget === "placeholder" ? "Screenshot placeholder selected" : "Image selected"}
            {" — click Replace or press ✕ to cancel"}
          </span>
        )}

        {!replaceTarget && (
          <div className="ml-auto text-xs text-gray-400">
            Click a screenshot placeholder or image to replace it
          </div>
        )}
      </div>

      {/* Editable iframe */}
      <iframe
        ref={iframeRef}
        title="Visual email editor"
        className="w-full bg-white"
        style={{ height: minHeightPx - 40 }}
        srcDoc={srcDoc}
        onLoad={handleLoad}
      />
    </div>
  );
}
