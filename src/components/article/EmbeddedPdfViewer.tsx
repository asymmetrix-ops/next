"use client";

import React, { useEffect } from "react";

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
  articleTitle = "Document",
  variant = "inline",
}) => {
  const isModal = variant === "modal";

  // Handle escape key to close (modal only)
  useEffect(() => {
    if (!isModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModal, onClose]);

  // Prevent body scroll when modal is open
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
    const safeName = String(articleTitle)
      .replace(/[\\/:*?"<>|]/g, " ")
      .slice(0, 180);
    a.download = `${safeName}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className={isModal ? "pdf-shell-overlay" : "pdf-shell-inline"}>
      {isModal && <div className="pdf-shell-backdrop" onClick={onClose} />}
      <div className={isModal ? "pdf-shell-modal" : "pdf-shell-card"}>
        <div className="pdf-topbar">
          <div className="pdf-topbar-title">
            <span className="pdf-topbar-name">{articleTitle}</span>
          </div>
          <div className="pdf-topbar-actions">
            <button
              type="button"
              className="pdf-icon-btn"
              onClick={handleDownload}
              disabled={!pdfUrl || isLoading}
              title="Download"
            >
              ⤓
            </button>
            {isModal && (
              <button
                type="button"
                className="pdf-icon-btn"
                onClick={onClose}
                title="Close"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="pdf-stage">
          {isLoading ? (
            <div className="pdf-loading">
              <div className="pdf-spinner" />
              <p>Loading…</p>
            </div>
          ) : pdfUrl ? (
            <iframe
              className="pdf-iframe"
              src={pdfUrl}
              title={articleTitle}
              loading="lazy"
              // Allow browser PDF viewer controls
              allow="fullscreen"
            />
          ) : (
            <div className="pdf-error">Could not load PDF</div>
          )}
        </div>
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
          background: rgba(0, 0, 0, 0.65);
        }
        .pdf-shell-modal {
          position: relative;
          width: min(980px, 100%);
          height: min(86vh, 860px);
          display: flex;
          flex-direction: column;
          background: #fff;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid #e5e7eb;
        }

        .pdf-shell-inline {
          width: 100%;
          margin: 14px 0 18px;
        }
        .pdf-shell-card {
          width: 100%;
          height: 600px;
          display: flex;
          flex-direction: column;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          overflow: hidden;
        }

        .pdf-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background: #1f2937;
          color: #fff;
          flex-shrink: 0;
        }
        .pdf-topbar-title {
          display: flex;
          align-items: center;
          min-width: 0;
        }
        .pdf-topbar-name {
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 70vw;
        }
        .pdf-topbar-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .pdf-icon-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 0;
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
          font-size: 16px;
          cursor: pointer;
        }
        .pdf-icon-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pdf-stage {
          position: relative;
          flex: 1;
          min-height: 0;
          background: #f3f4f6;
        }
        .pdf-iframe {
          width: 100%;
          height: 100%;
          border: 0;
          background: #fff;
        }

        .pdf-loading {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #6b7280;
        }
        .pdf-spinner {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: 3px solid #e5e7eb;
          border-top-color: #0a66c2;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        .pdf-error {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ef4444;
          font-weight: 600;
        }

        @media (max-width: 640px) {
          .pdf-shell-card {
            height: 480px;
          }
          .pdf-shell-modal {
            height: 92vh;
          }
          .pdf-topbar-name {
            max-width: 55vw;
          }
        }
      `}</style>
    </div>
  );
};

export default EmbeddedPdfViewer;


