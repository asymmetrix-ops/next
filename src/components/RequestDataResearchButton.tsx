"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  DATA_REQUEST_TYPES,
  RESEARCH_REQUEST_TYPES,
  DataRequestType,
  ResearchRequestType,
  RequestTab,
  RequestContext,
  getContextDefaults,
} from "@/lib/requestDataResearch";

interface RequestDataResearchButtonProps {
  label: string;
  context?: RequestContext;
  sourcePage?: string;
  className?: string;
  style?: React.CSSProperties;
}

const DATA_TAB_LABEL = "Data";
const DATA_TAB_SUBLABEL = "Add profiles & events";
const RESEARCH_TAB_LABEL = "Analysis";
const RESEARCH_TAB_SUBLABEL = "Research deliverables";

const DATA_URL_HINT = "Website, LinkedIn or news URL";
const RESEARCH_URL_HINT = "Deal announcement, news or sector reference";

const DATA_DETAILS_PLACEHOLDER =
  "Name of the company / sector / investor / advisor / individual / event — and why you think it should fall under Asymmetrix D&A coverage.";
const RESEARCH_DETAILS_PLACEHOLDER =
  "Subject of the analysis (company, deal, sector) — and what angle you'd like covered.";

const confirmationMessage =
  "Thank you for submitting a request. Asymmetrix will review your request and determine suitability for inclusion in our platform.";

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function LinkIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      style={{ display: "block", flexShrink: 0, color: "#94a3b8" }}
    >
      <path
        d="M6.5 9.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5L7.5 3.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 6.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5l1-1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      style={{ display: "block", flexShrink: 0, color: "#64748b" }}
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8 5v3.5l2 1.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function RequestDataResearchButton({
  label,
  context = "dashboard",
  sourcePage,
  className,
  style,
}: RequestDataResearchButtonProps) {
  const { user } = useAuth();
  const defaults = getContextDefaults(context);

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<RequestTab>(defaults.defaultTab);

  const [dataType, setDataType] = useState<DataRequestType | "">(defaults.defaultDataType);
  const [dataUrl, setDataUrl] = useState("");
  const [dataDetails, setDataDetails] = useState("");

  const [researchType, setResearchType] = useState<ResearchRequestType | "">(defaults.defaultResearchType);
  const [researchUrl, setResearchUrl] = useState("");
  const [researchDetails, setResearchDetails] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const openModal = () => {
    const d = getContextDefaults(context);
    setActiveTab(d.defaultTab);
    setDataType(d.defaultDataType);
    setDataUrl("");
    setDataDetails("");
    setResearchType(d.defaultResearchType);
    setResearchUrl("");
    setResearchDetails("");
    setError("");
    setSubmitted(false);
    setIsOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsOpen(false);
  };

  const handleTabSwitch = (tab: RequestTab) => {
    setActiveTab(tab);
    setError("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const isData = activeTab === "data";
    const requestType = isData ? dataType : researchType;
    const rawUrl = (isData ? dataUrl : researchUrl).trim();
    const url = rawUrl ? normalizeUrl(rawUrl) : "";
    const details = (isData ? dataDetails : researchDetails).trim();

    if (!requestType) {
      setError("Please select a type.");
      return;
    }
    if (isData && !url) {
      setError("Please provide a URL.");
      return;
    }
    if (!details) {
      setError("Please provide request details.");
      return;
    }

    setIsSubmitting(true);
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("asymmetrix_auth_token")
          : null;
      const response = await fetch("/api/request-data-research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-asym-token": token } : {}),
        },
        body: JSON.stringify({
          tab: activeTab,
          requestType,
          url: url || undefined,
          description: details,
          requesterName: user?.name || "",
          requesterEmail: user?.email || "",
          sourcePage,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "Unable to submit request. Please try again."
        );
      }

      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit request. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isData = activeTab === "data";

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={
          className ||
          "inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        }
        style={style}
      >
        {label}
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
            padding: "16px",
            zIndex: 10000,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rdr-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "580px",
              backgroundColor: "#fff",
              borderRadius: "14px",
              boxShadow: "0 20px 48px rgba(15, 23, 42, 0.22)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Close button */}
            <button
              type="button"
              aria-label="Close"
              onClick={closeModal}
              disabled={isSubmitting}
              style={{
                position: "absolute",
                top: "14px",
                right: "14px",
                width: "28px",
                height: "28px",
                border: "1px solid #e2e8f0",
                borderRadius: "50%",
                backgroundColor: "#f8fafc",
                color: "#64748b",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                fontSize: "16px",
                lineHeight: "1",
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
                id="rdr-title"
                style={{
                  margin: "0 0 4px",
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "#0f172a",
                  paddingRight: "36px",
                  lineHeight: 1.3,
                }}
              >
                Request Data and Research
              </h2>
              <p
                style={{
                  margin: "0 0 20px",
                  color: "#64748b",
                  fontSize: "13px",
                  lineHeight: 1.5,
                }}
              >
                Tell us what coverage you would like Asymmetrix to consider
                adding.
              </p>

              {/* Tab bar */}
              <div
                style={{
                  display: "flex",
                  borderBottom: "1px solid #e2e8f0",
                  marginBottom: "0",
                }}
              >
                {(
                  [
                    { key: "data" as RequestTab, label: DATA_TAB_LABEL, sub: DATA_TAB_SUBLABEL },
                    { key: "research" as RequestTab, label: RESEARCH_TAB_LABEL, sub: RESEARCH_TAB_SUBLABEL },
                  ] as const
                ).map(({ key, label: tLabel, sub }) => {
                  const active = activeTab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleTabSwitch(key)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "0 0 12px",
                        textAlign: key === "research" ? "right" : "left",
                        borderBottom: active
                          ? "2px solid #0075df"
                          : "2px solid transparent",
                        marginBottom: "-1px",
                        transition: "border-color 0.15s",
                        flex: "1 1 50%",
                        width: "50%",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: active ? 600 : 500,
                          color: active ? "#0f172a" : "#64748b",
                          lineHeight: 1.2,
                          marginBottom: "2px",
                        }}
                      >
                        {tLabel}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: active ? "#475569" : "#94a3b8",
                          lineHeight: 1.2,
                        }}
                      >
                        {sub}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form body */}
            {submitted ? (
              <div style={{ padding: "24px", paddingRight: "40px" }}>
                <h3
                  style={{
                    margin: "0 0 10px",
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#0f172a",
                  }}
                >
                  Request submitted
                </h3>
                <p
                  style={{
                    margin: 0,
                    color: "#475569",
                    fontSize: "14px",
                    lineHeight: 1.6,
                  }}
                >
                  {confirmationMessage}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ padding: "20px 24px 24px" }}>
                {/* Type dropdown */}
                <div style={{ marginBottom: "14px" }}>
                  <label
                    htmlFor="rdr-type"
                    style={labelStyle}
                  >
                    Type <RequiredMark />
                  </label>
                  {isData ? (
                    <select
                      id="rdr-type"
                      value={dataType}
                      onChange={(e) => setDataType(e.target.value as DataRequestType | "")}
                      style={selectStyle}
                    >
                      <option value="">Select a profile</option>
                      {DATA_REQUEST_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      id="rdr-type"
                      value={researchType}
                      onChange={(e) => setResearchType(e.target.value as ResearchRequestType | "")}
                      style={selectStyle}
                    >
                      <option value="">Select an analysis</option>
                      {RESEARCH_REQUEST_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* URL field */}
                <div style={{ marginBottom: "14px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: "6px",
                    }}
                  >
                    <label htmlFor="rdr-url" style={labelStyle}>
                      URL{isData ? <RequiredMark /> : <span style={{ color: "#94a3b8", fontWeight: 400, marginLeft: "4px" }}>optional</span>}
                    </label>
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                      {isData ? DATA_URL_HINT : RESEARCH_URL_HINT}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      padding: "9px 12px",
                      backgroundColor: "#fff",
                    }}
                  >
                    <LinkIcon />
                    <input
                      id="rdr-url"
                      type="text"
                      inputMode="url"
                      autoComplete="url"
                      value={isData ? dataUrl : researchUrl}
                      onChange={(e) =>
                        isData
                          ? setDataUrl(e.target.value)
                          : setResearchUrl(e.target.value)
                      }
                      placeholder="example.com"
                      style={{
                        flex: 1,
                        border: "none",
                        outline: "none",
                        fontSize: "14px",
                        color: "#0f172a",
                        backgroundColor: "transparent",
                        minWidth: 0,
                      }}
                    />
                  </div>
                </div>

                {/* Request details */}
                <div style={{ marginBottom: "4px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: "6px",
                    }}
                  >
                    <label htmlFor="rdr-details" style={labelStyle}>
                      Request details <RequiredMark />
                    </label>
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                      Name + why it fits D&amp;A coverage
                    </span>
                  </div>
                  <textarea
                    id="rdr-details"
                    value={isData ? dataDetails : researchDetails}
                    onChange={(e) =>
                      isData
                        ? setDataDetails(e.target.value)
                        : setResearchDetails(e.target.value)
                    }
                    rows={5}
                    placeholder={
                      isData
                        ? DATA_DETAILS_PLACEHOLDER
                        : RESEARCH_DETAILS_PLACEHOLDER
                    }
                    style={{
                      width: "100%",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      fontSize: "14px",
                      color: "#0f172a",
                      resize: "vertical",
                      minHeight: "110px",
                      lineHeight: 1.5,
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {error && (
                  <p
                    role="alert"
                    style={{
                      margin: "10px 0 0",
                      color: "#dc2626",
                      fontSize: "13px",
                    }}
                  >
                    {error}
                  </p>
                )}

                {/* Footer */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: isData ? "space-between" : "flex-end",
                    marginTop: "18px",
                  }}
                >
                  {isData && (
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        fontSize: "12px",
                        color: "#64748b",
                      }}
                    >
                      <ClockIcon />
                      Typical turnaround: 2–3 business days
                    </span>
                  )}

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={isSubmitting}
                      style={{
                        padding: "9px 18px",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        backgroundColor: "#fff",
                        color: "#334155",
                        fontWeight: 500,
                        fontSize: "14px",
                        cursor: isSubmitting ? "not-allowed" : "pointer",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      style={{
                        padding: "9px 22px",
                        borderRadius: "8px",
                        border: "none",
                        backgroundColor: "#0075df",
                        color: "#fff",
                        fontWeight: 600,
                        fontSize: "14px",
                        cursor: isSubmitting ? "not-allowed" : "pointer",
                        opacity: isSubmitting ? 0.7 : 1,
                      }}
                    >
                      {isSubmitting ? "Submitting…" : "Submit"}
                    </button>
                  </div>
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
    <span style={{ color: "#dc2626", marginLeft: "2px" }} aria-hidden="true">
      *
    </span>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 600,
  color: "#334155",
  lineHeight: 1,
  margin: "0 0 6px",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  padding: "9px 12px",
  fontSize: "14px",
  color: "#0f172a",
  backgroundColor: "#fff",
  appearance: "auto",
  margin: 0,
};
