"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { fetchGlobalSearchBySource } from "@/lib/globalSearch";

const confirmationMessage =
  "Thank you for your tip. The Asymmetrix team will review it and may follow up if you've said we can contact you.";

const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, color: "#334155", lineHeight: 1, margin: "0 0 6px" };
const fieldStyle: React.CSSProperties = { width: "100%", border: "1px solid #cbd5e1", borderRadius: 8, padding: "9px 12px", fontSize: 14, color: "#0f172a", backgroundColor: "#fff", boxSizing: "border-box" };

type Company = { id: number; title: string };

function CompanyPicker({ value, onChange }: { value: Company | null; onChange: (c: Company | null) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Company[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) return setResults([]);
    const ac = new AbortController();
    const t = setTimeout(() => {
      fetchGlobalSearchBySource(q, "company", ac.signal)
        .then(({ items }) => setResults(items.slice(0, 6).map((i) => ({ id: i.id, title: i.title }))))
        .catch(() => undefined);
    }, 250);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [q]);

  if (value) {
    return (
      <div style={{ ...fieldStyle, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>{value.title}</span>
        <button type="button" aria-label="Remove company" onClick={() => onChange(null)} style={{ border: "none", background: "none", cursor: "pointer", color: "#64748b", fontSize: 16 }}>
          ×
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        id="dt-company"
        type="text"
        value={q}
        autoComplete="off"
        placeholder="Search for a company"
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        style={fieldStyle}
      />
      {open && results.length > 0 && (
        <div style={{ position: "absolute", zIndex: 5, left: 0, right: 0, top: "calc(100% + 4px)", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, boxShadow: "0 8px 24px rgba(15,23,42,0.12)", maxHeight: 200, overflowY: "auto" }}>
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(r);
                setQ("");
                setOpen(false);
              }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", border: "none", background: "none", cursor: "pointer", fontSize: 14, color: "#0f172a" }}
            >
              {r.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DealTipButton() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [tip, setTip] = useState("");
  const [company, setCompany] = useState<Company | null>(null);
  const [contactOk, setContactOk] = useState<"yes" | "no">("yes");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const openModal = () => {
    setTip("");
    setCompany(null);
    setContactOk("yes");
    setError("");
    setSubmitted(false);
    setIsOpen(true);
  };
  const closeModal = () => !submitting && setIsOpen(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!tip.trim()) return setError("Please enter your tip.");
    setSubmitting(true);
    try {
      const token = localStorage.getItem("asymmetrix_auth_token");
      const res = await fetch("/api/news-deal-tip", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { "x-asym-token": token } : {}) },
        body: JSON.stringify({
          tip: tip.trim(),
          companyId: company?.id,
          companyName: company?.title,
          canContact: contactOk === "yes",
          requesterName: user?.name || "",
          requesterEmail: user?.email || "",
          sourcePage: "News",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Unable to submit your tip. Please try again.");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit your tip. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button type="button" className="nw-btn nw-btn-primary" onClick={openModal}>
        Send a deal tip
      </button>

      {isOpen && (
        <div role="presentation" onClick={closeModal} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 10000 }}>
          <div role="dialog" aria-modal="true" aria-labelledby="dt-title" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, backgroundColor: "#fff", borderRadius: 14, boxShadow: "0 20px 48px rgba(15, 23, 42, 0.22)", position: "relative", overflow: "hidden" }}>
            <button type="button" aria-label="Close" onClick={closeModal} disabled={submitting} style={{ position: "absolute", top: 14, right: 14, width: 28, height: 28, border: "1px solid #e2e8f0", borderRadius: "50%", backgroundColor: "#f8fafc", color: "#64748b", cursor: submitting ? "not-allowed" : "pointer", fontSize: 16, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              ×
            </button>

            <div style={{ padding: "24px 24px 0" }}>
              <h2 id="dt-title" style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "#0f172a", paddingRight: 36, lineHeight: 1.3 }}>
                Send a deal tip
              </h2>
              <p style={{ margin: "0 0 4px", color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>
                Heard about a deal, a mandate or a company on the move? Tell us and we&apos;ll look into it.
              </p>
            </div>

            {submitted ? (
              <div style={{ padding: "20px 40px 24px 24px" }}>
                <h3 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Tip submitted</h3>
                <p style={{ margin: 0, color: "#475569", fontSize: 14, lineHeight: 1.6 }}>{confirmationMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ padding: "16px 24px 24px" }}>
                <div style={{ marginBottom: 14 }}>
                  <label htmlFor="dt-tip" style={labelStyle}>
                    Tip <span style={{ color: "#dc2626" }} aria-hidden="true">*</span>
                  </label>
                  <textarea id="dt-tip" value={tip} onChange={(e) => setTip(e.target.value)} rows={5} placeholder="What have you heard? Include the companies involved and anything we can verify." style={{ ...fieldStyle, resize: "vertical", minHeight: 110, lineHeight: 1.5, padding: "10px 12px" }} />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label htmlFor="dt-company" style={labelStyle}>
                    Company <span style={{ color: "#94a3b8", fontWeight: 400, marginLeft: 4 }}>optional</span>
                  </label>
                  <CompanyPicker value={company} onChange={setCompany} />
                </div>

                <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
                  <legend style={{ ...labelStyle, padding: 0 }}>Can we contact you about this?</legend>
                  <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
                    {(["yes", "no"] as const).map((v) => (
                      <label key={v} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#0f172a", cursor: "pointer" }}>
                        <input type="radio" name="dt-contact" value={v} checked={contactOk === v} onChange={() => setContactOk(v)} style={{ accentColor: "#0075df" }} />
                        {v === "yes" ? "Yes" : "No"}
                      </label>
                    ))}
                  </div>
                </fieldset>

                {error && (
                  <p role="alert" style={{ margin: "10px 0 0", color: "#dc2626", fontSize: 13 }}>
                    {error}
                  </p>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
                  <button type="button" onClick={closeModal} disabled={submitting} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e2e8f0", backgroundColor: "#fff", color: "#334155", fontWeight: 500, fontSize: 14, cursor: submitting ? "not-allowed" : "pointer" }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} style={{ padding: "9px 22px", borderRadius: 8, border: "none", backgroundColor: "#0075df", color: "#fff", fontWeight: 600, fontSize: 14, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }}>
                    {submitting ? "Submitting…" : "Submit"}
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
