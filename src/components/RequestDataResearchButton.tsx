"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  REQUEST_DATA_RESEARCH_TYPES,
  RequestDataResearchType,
} from "@/lib/requestDataResearch";

interface RequestDataResearchButtonProps {
  label: string;
  defaultType?: RequestDataResearchType | "";
  sourcePage?: string;
  className?: string;
  style?: React.CSSProperties;
}

const confirmationMessage =
  "Thank you for submitting a request. Asymmetrix will review your request and determine suitability for inclusion in our platform.";

export default function RequestDataResearchButton({
  label,
  defaultType = "",
  sourcePage,
  className,
  style,
}: RequestDataResearchButtonProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [requestType, setRequestType] = useState<
    RequestDataResearchType | ""
  >(defaultType);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const openModal = () => {
    setRequestType(defaultType);
    setDescription("");
    setError("");
    setSubmitted(false);
    setIsOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsOpen(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const trimmedDescription = description.trim();
    if (!requestType) {
      setError("Please select a request type.");
      return;
    }
    if (!trimmedDescription) {
      setError("Please describe the request.");
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
          requestType,
          description: trimmedDescription,
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
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
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
            aria-labelledby="request-data-research-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "520px",
              backgroundColor: "#fff",
              borderRadius: "12px",
              boxShadow: "0 20px 40px rgba(15, 23, 42, 0.24)",
              padding: "24px",
              position: "relative",
            }}
          >
            <button
              type="button"
              aria-label="Close request form"
              onClick={closeModal}
              disabled={isSubmitting}
              style={{
                position: "absolute",
                top: "14px",
                right: "14px",
                width: "32px",
                height: "32px",
                border: "none",
                borderRadius: "999px",
                backgroundColor: "#f1f5f9",
                color: "#334155",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                fontSize: "20px",
                lineHeight: "1",
              }}
            >
              X
            </button>

            {submitted ? (
              <div style={{ paddingRight: "28px" }}>
                <h2
                  id="request-data-research-title"
                  style={{
                    margin: "0 0 12px",
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "#0f172a",
                  }}
                >
                  Request submitted
                </h2>
                <p
                  style={{
                    margin: 0,
                    color: "#475569",
                    fontSize: "15px",
                    lineHeight: 1.6,
                  }}
                >
                  {confirmationMessage}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h2
                  id="request-data-research-title"
                  style={{
                    margin: "0 0 8px",
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "#0f172a",
                    paddingRight: "32px",
                  }}
                >
                  Request Data and Research
                </h2>
                <p
                  style={{
                    margin: "0 0 20px",
                    color: "#64748b",
                    fontSize: "14px",
                    lineHeight: 1.5,
                  }}
                >
                  Tell us what coverage you would like Asymmetrix to consider
                  adding.
                </p>

                <label
                  htmlFor="request-data-research-type"
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    color: "#334155",
                    fontSize: "14px",
                    fontWeight: 600,
                  }}
                >
                  Type
                </label>
                <select
                  id="request-data-research-type"
                  value={requestType}
                  onChange={(event) =>
                    setRequestType(
                      event.target.value as RequestDataResearchType | ""
                    )
                  }
                  style={{
                    width: "100%",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    marginBottom: "16px",
                    fontSize: "14px",
                    color: "#0f172a",
                    backgroundColor: "#fff",
                  }}
                >
                  <option value="">Select request type</option>
                  {REQUEST_DATA_RESEARCH_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>

                <label
                  htmlFor="request-data-research-description"
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    color: "#334155",
                    fontSize: "14px",
                    fontWeight: 600,
                  }}
                >
                  Request details
                </label>
                <textarea
                  id="request-data-research-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={6}
                  placeholder="Describe the company, profile, report, individual, investor, advisor, or event you would like us to research."
                  style={{
                    width: "100%",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    fontSize: "14px",
                    color: "#0f172a",
                    resize: "vertical",
                    minHeight: "128px",
                  }}
                />

                {error && (
                  <p
                    role="alert"
                    style={{
                      margin: "12px 0 0",
                      color: "#dc2626",
                      fontSize: "14px",
                    }}
                  >
                    {error}
                  </p>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: "20px",
                  }}
                >
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      backgroundColor: "#0075df",
                      color: "#fff",
                      fontWeight: 600,
                      padding: "10px 24px",
                      borderRadius: "8px",
                      border: "none",
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                      fontSize: "14px",
                      opacity: isSubmitting ? 0.7 : 1,
                    }}
                  >
                    {isSubmitting ? "Submitting..." : "Submit"}
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
