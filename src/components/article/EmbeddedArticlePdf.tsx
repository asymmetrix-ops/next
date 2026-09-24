"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** PDF user-space scale used for rendering canvases (higher = sharper). */
const PDF_RENDER_SCALE = 1.5;

type EmbeddedArticlePdfProps = {
  url: string;
  title?: string;
};

export function EmbeddedArticlePdf({ url, title }: EmbeddedArticlePdfProps) {
  const pagesRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<HTMLDivElement[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const mount = pagesRef.current;
    if (!mount || !url) return;

    let cancelled = false;
    slideRefs.current = [];

    const renderPdf = async () => {
      setStatus("loading");
      setErrorMessage("");
      setPageCount(0);
      setCurrentPage(1);
      mount.replaceChildren();

      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

        const token = localStorage.getItem("asymmetrix_auth_token");
        const loadingTask = pdfjs.getDocument({
          url,
          httpHeaders: token
            ? { Authorization: `Bearer ${token}` }
            : undefined,
          withCredentials: false,
        });
        const doc = await loadingTask.promise;

        if (cancelled) return;
        setPageCount(doc.numPages);

        for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
          if (cancelled) return;

          const page = await doc.getPage(pageNum);
          const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });
          const canvas = document.createElement("canvas");
          canvas.setAttribute("role", "img");
          canvas.setAttribute(
            "aria-label",
            `${title || "Document"} — page ${pageNum} of ${doc.numPages}`
          );

          const context = canvas.getContext("2d");
          if (!context) continue;

          const outputScale = window.devicePixelRatio || 1;
          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.className = "article-pdf-embed-canvas";

          const transform =
            outputScale !== 1
              ? [outputScale, 0, 0, outputScale, 0, 0]
              : undefined;

          await page.render({
            canvasContext: context,
            viewport,
            transform,
          }).promise;

          const slide = document.createElement("div");
          slide.className = "article-pdf-embed-slide";
          slide.appendChild(canvas);
          mount.appendChild(slide);
          slideRefs.current.push(slide);
        }

        if (!cancelled) setStatus("ready");
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage(
            err instanceof Error ? err.message : "Failed to load document"
          );
        }
      }
    };

    void renderPdf();

    return () => {
      cancelled = true;
    };
  }, [url, title]);

  // Track which slide is centered in the viewport to update the page counter.
  useEffect(() => {
    const mount = pagesRef.current;
    if (!mount || status !== "ready") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const idx = slideRefs.current.indexOf(visible.target as HTMLDivElement);
        if (idx !== -1) setCurrentPage(idx + 1);
      },
      { root: mount, threshold: [0.5, 0.75, 1] }
    );

    slideRefs.current.forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, [status, pageCount]);

  const goToPage = useCallback((pageNum: number) => {
    const slide = slideRefs.current[pageNum - 1];
    slide?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const goPrev = useCallback(() => {
    goToPage(Math.max(1, currentPage - 1));
  }, [currentPage, goToPage]);

  const goNext = useCallback(() => {
    goToPage(Math.min(pageCount, currentPage + 1));
  }, [currentPage, pageCount, goToPage]);

  return (
    <div
      className="article-pdf-embed"
      aria-label={title || "Document"}
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
    >
      {status === "loading" ? (
        <p className="article-pdf-embed-status">Loading document…</p>
      ) : null}
      {status === "error" ? (
        <p className="article-pdf-embed-error">{errorMessage}</p>
      ) : null}

      <div className="article-pdf-embed-viewport">
        <div ref={pagesRef} className="article-pdf-embed-pages" />

        {status === "ready" && pageCount > 1 ? (
          <>
            <button
              type="button"
              className="article-pdf-embed-nav article-pdf-embed-nav-up"
              onClick={goPrev}
              disabled={currentPage <= 1}
              aria-label="Previous page"
            >
              ▲
            </button>
            <button
              type="button"
              className="article-pdf-embed-nav article-pdf-embed-nav-down"
              onClick={goNext}
              disabled={currentPage >= pageCount}
              aria-label="Next page"
            >
              ▼
            </button>
            <div className="article-pdf-embed-counter">
              {currentPage} / {pageCount}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
