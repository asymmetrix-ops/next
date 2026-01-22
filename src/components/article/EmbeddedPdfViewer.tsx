"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Set worker
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
}

interface EmbeddedPdfViewerProps {
  pdfUrl: string | null;
  isLoading: boolean;
  onClose: () => void;
  articleTitle?: string;
  variant?: "inline" | "modal";
}

const EmbeddedPdfViewer: React.FC<EmbeddedPdfViewerProps> = ({
  pdfUrl,
  isLoading,
  onClose,
  articleTitle = "Article",
  variant = "inline",
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isModal = variant === "modal";

  // Load PDF document
  useEffect(() => {
    if (!pdfUrl) {
      setPdfDoc(null);
      setTotalPages(0);
      return;
    }

    let cancelled = false;
    const loadPdf = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const doc = await loadingTask.promise;
        if (!cancelled) {
          setPdfDoc(doc);
          setTotalPages(doc.numPages);
          setCurrentPage(1);
        }
      } catch (err) {
        console.error("Failed to load PDF:", err);
      }
    };
    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  // Render current page to canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || !containerRef.current) return;

    let cancelled = false;
    const renderPage = async () => {
      setPageLoading(true);
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (cancelled) return;

        const container = containerRef.current;
        if (!container) return;

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // Calculate scale to fit page in container
        const viewport = page.getViewport({ scale: 1 });
        const scaleX = containerWidth / viewport.width;
        const scaleY = containerHeight / viewport.height;
        const scale = Math.min(scaleX, scaleY) * 0.95; // 95% to add some padding

        const scaledViewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        // Set canvas size
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        // Render page
        await page.render({
          canvasContext: context,
          viewport: scaledViewport,
        }).promise;

        setPageLoading(false);
      } catch (err) {
        console.error("Failed to render page:", err);
        setPageLoading(false);
      }
    };

    renderPage();

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, currentPage]);

  const goToPrevPage = useCallback(() => {
    if (currentPage > 1 && !isAnimating) {
      setSlideDirection("right");
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentPage((p) => p - 1);
        setTimeout(() => {
          setSlideDirection(null);
          setIsAnimating(false);
        }, 50);
      }, 200);
    }
  }, [currentPage, isAnimating]);

  const goToNextPage = useCallback(() => {
    if (totalPages > 0 && currentPage < totalPages && !isAnimating) {
      setSlideDirection("left");
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentPage((p) => p + 1);
        setTimeout(() => {
          setSlideDirection(null);
          setIsAnimating(false);
        }, 50);
      }, 200);
    }
  }, [currentPage, totalPages, isAnimating]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        goToPrevPage();
      } else if (e.key === "ArrowRight") {
        goToNextPage();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, goToPrevPage, goToNextPage]);

  // Prevent body scroll in modal
  useEffect(() => {
    if (!isModal) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isModal]);

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    const safeName = articleTitle.replace(/[\\/:*?"<>|]/g, " ").slice(0, 180);
    a.download = `Asymmetrix - ${safeName}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (totalPages === 0 || isAnimating) return;
    const newPage = Math.max(1, Math.min(totalPages, Number(e.target.value)));
    if (newPage !== currentPage) {
      const dir = newPage > currentPage ? "left" : "right";
      setSlideDirection(dir);
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentPage(newPage);
        setTimeout(() => {
          setSlideDirection(null);
          setIsAnimating(false);
        }, 50);
      }, 200);
    }
  };

  const getAnimationClass = () => {
    if (!slideDirection || !isAnimating) return "";
    return slideDirection === "left" ? "slide-out-left" : "slide-out-right";
  };

  const pdfReady = pdfDoc && totalPages > 0;

  return (
    <div className={isModal ? "pdf-shell-overlay" : "pdf-shell-inline"}>
      {isModal && <div className="pdf-shell-backdrop" onClick={onClose} />}
      <div className={isModal ? "pdf-shell-modal" : "pdf-shell-card"}>
        {/* Top bar */}
        <div className="pdf-topbar">
          <div className="pdf-topbar-title">
            <span className="pdf-topbar-name">{articleTitle}</span>
            {totalPages > 0 && (
              <>
                <span className="pdf-topbar-dot">·</span>
                <span className="pdf-topbar-pages">{totalPages} pages</span>
              </>
            )}
          </div>
          <div className="pdf-topbar-actions">
            <button
              type="button"
              className="pdf-icon-btn"
              onClick={handleDownload}
              disabled={!pdfUrl || isLoading}
              title="Download"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
            {isModal && (
              <button type="button" className="pdf-icon-btn" onClick={onClose} title="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* PDF Stage */}
        <div className="pdf-stage" ref={containerRef}>
          {isLoading ? (
            <div className="pdf-loading">
              <div className="pdf-spinner" />
              <p>Loading…</p>
            </div>
          ) : pdfReady ? (
            <>
              <div className={`pdf-canvas-wrapper ${getAnimationClass()}`}>
                <canvas ref={canvasRef} className="pdf-canvas" />
                {pageLoading && (
                  <div className="pdf-page-loading">
                    <div className="pdf-spinner-small" />
                  </div>
                )}
              </div>

              {/* Navigation arrows */}
              {totalPages > 1 && (
                <>
                  <button
                    type="button"
                    className="pdf-nav-btn pdf-nav-left"
                    onClick={goToPrevPage}
                    disabled={currentPage === 1 || isAnimating}
                    aria-label="Previous page"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="pdf-nav-btn pdf-nav-right"
                    onClick={goToNextPage}
                    disabled={currentPage >= totalPages || isAnimating}
                    aria-label="Next page"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </>
              )}
            </>
          ) : pdfUrl ? (
            <div className="pdf-loading">
              <div className="pdf-spinner" />
              <p>Loading PDF…</p>
            </div>
          ) : (
            <div className="pdf-error">Could not load PDF</div>
          )}
        </div>

        {/* Bottom bar */}
        {pdfReady && totalPages > 1 && (
          <div className="pdf-bottombar">
            <span className="pdf-page-label">
              {currentPage} / {totalPages}
            </span>
            <input
              type="range"
              className="pdf-slider"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={handleSliderChange}
              disabled={isAnimating}
            />
          </div>
        )}
      </div>

      <style jsx>{`
        .pdf-shell-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .pdf-shell-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
        }
        .pdf-shell-modal {
          position: relative;
          width: min(900px, 95vw);
          height: min(80vh, 700px);
          display: flex;
          flex-direction: column;
          background: #fff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
        }
        .pdf-shell-inline {
          width: 100%;
          margin: 16px 0;
        }
        .pdf-shell-card {
          width: 100%;
          height: 520px;
          display: flex;
          flex-direction: column;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
        }

        .pdf-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: #1f2937;
          color: #fff;
          flex-shrink: 0;
        }
        .pdf-topbar-title {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          font-size: 14px;
        }
        .pdf-topbar-name {
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 50vw;
        }
        .pdf-topbar-dot {
          opacity: 0.6;
        }
        .pdf-topbar-pages {
          opacity: 0.85;
          white-space: nowrap;
        }
        .pdf-topbar-actions {
          display: flex;
          gap: 8px;
        }
        .pdf-icon-btn {
          width: 36px;
          height: 36px;
          border: 0;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s;
        }
        .pdf-icon-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        .pdf-icon-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .pdf-stage {
          position: relative;
          flex: 1;
          min-height: 0;
          background: #f3f4f6;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pdf-canvas-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          will-change: transform, opacity;
        }

        .pdf-canvas {
          display: block;
          max-width: 100%;
          max-height: 100%;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          background: #fff;
        }

        .pdf-page-loading {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.8);
        }

        /* Slide animations */
        .slide-out-left {
          animation: slideOutLeft 0.2s ease-out forwards;
        }
        .slide-out-right {
          animation: slideOutRight 0.2s ease-out forwards;
        }

        @keyframes slideOutLeft {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(-50px);
            opacity: 0;
          }
        }
        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(50px);
            opacity: 0;
          }
        }

        .pdf-nav-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 48px;
          height: 48px;
          border: 0;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.7);
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 20;
          transition: background 0.15s, opacity 0.15s, transform 0.15s;
        }
        .pdf-nav-btn:hover:not(:disabled) {
          background: rgba(0, 0, 0, 0.85);
          transform: translateY(-50%) scale(1.05);
        }
        .pdf-nav-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .pdf-nav-left {
          left: 16px;
        }
        .pdf-nav-right {
          right: 16px;
        }

        .pdf-bottombar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(31, 41, 55, 0.95);
          flex-shrink: 0;
        }
        .pdf-page-label {
          color: #fff;
          font-weight: 700;
          font-size: 14px;
          min-width: 50px;
        }
        .pdf-slider {
          flex: 1;
          height: 6px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.3);
          appearance: none;
          cursor: pointer;
        }
        .pdf-slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
        }
        .pdf-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          border: 0;
          cursor: pointer;
        }
        .pdf-slider:disabled {
          opacity: 0.5;
        }

        .pdf-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #6b7280;
        }
        .pdf-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        .pdf-spinner-small {
          width: 24px;
          height: 24px;
          border: 2px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .pdf-error {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ef4444;
          font-weight: 600;
        }

        @media (max-width: 640px) {
          .pdf-shell-card {
            height: 400px;
          }
          .pdf-nav-btn {
            width: 40px;
            height: 40px;
          }
          .pdf-nav-left {
            left: 8px;
          }
          .pdf-nav-right {
            right: 8px;
          }
          .pdf-topbar-name {
            max-width: 40vw;
          }
        }
      `}</style>
    </div>
  );
};

export default EmbeddedPdfViewer;
