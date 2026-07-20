"use client";

import React, { useRef, useState } from "react";
import { authService } from "@/lib/auth";
import { normalizeCompanyUrl } from "@/lib/mcpGuestFlag";

const CONFIRMATION_MESSAGE =
  "Thanks — we'll review this and update the list shortly.";

function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 3.5v9M3.5 8h9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface McpGuestFlagCompanyButtonProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function McpGuestFlagCompanyButton({
  className,
  style,
}: McpGuestFlagCompanyButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [proofImageUrl, setProofImageUrl] = useState("");
  const [proofImageName, setProofImageName] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const resetForm = () => {
    setCompanyName("");
    setCompanyUrl("");
    setProofUrl("");
    setProofImageUrl("");
    setProofImageName("");
    setError("");
    setSubmitted(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const openModal = () => {
    resetForm();
    setIsOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting || isUploadingImage) return;
    setIsOpen(false);
  };

  const handleImageSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setIsUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = authService.getToken();
      const response = await fetch("/api/mcp-guest/flag-company/upload", {
        method: "POST",
        headers: token ? { "x-asym-token": token } : {},
        body: formData,
      });

      const data = (await response.json().catch(() => null)) as {
        url?: string;
        error?: string;
      } | null;

      if (!response.ok || !data?.url) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "Unable to upload image. Please try again."
        );
      }

      setProofImageUrl(data.url);
      setProofImageName(file.name);
    } catch (err) {
      setProofImageUrl("");
      setProofImageName("");
      setError(
        err instanceof Error
          ? err.message
          : "Unable to upload image. Please try again."
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const trimmedName = companyName.trim();
    const trimmedCompanyUrl = normalizeCompanyUrl(companyUrl);
    const trimmedProofUrl = normalizeCompanyUrl(proofUrl);

    if (!trimmedName) {
      setError("Please enter a company name.");
      return;
    }
    if (!trimmedCompanyUrl) {
      setError("Please enter a company URL.");
      return;
    }
    if (!trimmedProofUrl && !proofImageUrl) {
      setError("Please provide proof as a URL or image upload.");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = authService.getToken();
      const response = await fetch("/api/mcp-guest/flag-company", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-asym-token": token } : {}),
        },
        body: JSON.stringify({
          company_name: trimmedName,
          company_url: trimmedCompanyUrl,
          proof_url: trimmedProofUrl || undefined,
          proof_image_url: proofImageUrl || undefined,
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "Unable to submit flag. Please try again."
        );
      }

      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit flag. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const buttonStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 36,
    padding: "0 14px",
    fontSize: 13,
    fontWeight: 600,
    color: "#fff",
    backgroundColor: "oklch(56% 0.13 158)",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    ...style,
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={className}
        style={buttonStyle}
      >
        <PlusIcon />
        Flag a company
      </button>

      {isOpen && (
        <div
          role="presentation"
          onClick={closeModal}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 10000,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mcp-flag-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 580,
              backgroundColor: "#fff",
              borderRadius: 14,
              boxShadow: "0 20px 48px rgba(15, 23, 42, 0.22)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={closeModal}
              disabled={isSubmitting || isUploadingImage}
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                width: 28,
                height: 28,
                border: "1px solid #e2e8f0",
                borderRadius: "50%",
                backgroundColor: "#f8fafc",
                color: "#64748b",
                cursor:
                  isSubmitting || isUploadingImage ? "not-allowed" : "pointer",
                fontSize: 16,
                lineHeight: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1,
              }}
            >
              ×
            </button>

            <div style={{ padding: "24px 24px 0" }}>
              <h2
                id="mcp-flag-title"
                style={{
                  margin: "0 0 4px",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#0f172a",
                  paddingRight: 36,
                  lineHeight: 1.3,
                }}
              >
                Flag a company
              </h2>
              <p
                style={{
                  margin: "0 0 20px",
                  color: "#64748b",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                Tell us about a company with MCP that should appear in this list.
                Submissions are reviewed manually before any changes are made.
              </p>
            </div>

            {submitted ? (
              <div style={{ padding: "24px", paddingRight: 40 }}>
                <h3
                  style={{
                    margin: "0 0 10px",
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#0f172a",
                  }}
                >
                  Submission received
                </h3>
                <p
                  style={{
                    margin: 0,
                    color: "#475569",
                    fontSize: 14,
                    lineHeight: 1.6,
                  }}
                >
                  {CONFIRMATION_MESSAGE}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ padding: "0 24px 24px" }}>
                <div style={{ marginBottom: 14 }}>
                  <label htmlFor="mcp-flag-company-name" style={labelStyle}>
                    Company name <RequiredMark />
                  </label>
                  <input
                    id="mcp-flag-company-name"
                    type="text"
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                    placeholder="Acme Corp"
                    style={inputStyle}
                    required
                  />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label htmlFor="mcp-flag-company-url" style={labelStyle}>
                    Company URL <RequiredMark />
                  </label>
                  <input
                    id="mcp-flag-company-url"
                    type="text"
                    inputMode="url"
                    autoComplete="url"
                    value={companyUrl}
                    onChange={(event) => setCompanyUrl(event.target.value)}
                    placeholder="example.com"
                    style={inputStyle}
                    required
                  />
                </div>

                <div style={{ marginBottom: 4 }}>
                  <label htmlFor="mcp-flag-proof-url" style={labelStyle}>
                    Proof of MCP implementation <RequiredMark />
                  </label>
                  <p
                    style={{
                      margin: "0 0 8px",
                      color: "#64748b",
                      fontSize: 12,
                      lineHeight: 1.5,
                    }}
                  >
                    Provide a link or upload a screenshot. At least one is
                    required.
                  </p>
                  <input
                    id="mcp-flag-proof-url"
                    type="text"
                    inputMode="url"
                    value={proofUrl}
                    onChange={(event) => setProofUrl(event.target.value)}
                    placeholder="Press release, blog post, etc."
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginTop: 12 }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(event) => void handleImageSelect(event)}
                    style={{ display: "none" }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage || isSubmitting}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px dashed #cbd5e1",
                      borderRadius: 8,
                      backgroundColor: "#f8fafc",
                      color: "#334155",
                      fontSize: 14,
                      fontWeight: 500,
                      cursor:
                        isUploadingImage || isSubmitting
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    {isUploadingImage
                      ? "Uploading image…"
                      : proofImageName
                        ? `Uploaded: ${proofImageName}`
                        : "Upload screenshot"}
                  </button>
                </div>

                {error && (
                  <p
                    role="alert"
                    style={{
                      margin: "12px 0 0",
                      color: "#dc2626",
                      fontSize: 13,
                    }}
                  >
                    {error}
                  </p>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 10,
                    marginTop: 18,
                  }}
                >
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isSubmitting || isUploadingImage}
                    style={secondaryButtonStyle}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || isUploadingImage}
                    style={primaryButtonStyle}
                  >
                    {isSubmitting ? "Submitting…" : "Submit"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function RequiredMark() {
  return (
    <span style={{ color: "#dc2626", marginLeft: 2 }} aria-hidden="true">
      *
    </span>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#334155",
  lineHeight: 1,
  margin: "0 0 6px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 14,
  color: "#0f172a",
  boxSizing: "border-box",
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "9px 18px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  backgroundColor: "#fff",
  color: "#334155",
  fontWeight: 500,
  fontSize: 14,
  cursor: "pointer",
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "9px 22px",
  borderRadius: 8,
  border: "none",
  backgroundColor: "#0075df",
  color: "#fff",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
};
