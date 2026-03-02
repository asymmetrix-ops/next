"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type EmailPreviewPayload = {
  created_at?: number;
  subject?: string;
  html?: string;
  to?: string;
};

const EMAIL_PREVIEW_STORAGE_KEY = "asymmetrix_email_preview_v1";

export default function EmailPreviewPage() {
  const [payload, setPayload] = useState<EmailPreviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(EMAIL_PREVIEW_STORAGE_KEY);
      if (!raw) {
        setPayload(null);
        return;
      }
      const parsed = JSON.parse(raw) as EmailPreviewPayload;
      setPayload(parsed && typeof parsed === "object" ? parsed : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load preview");
      setPayload(null);
    }
  }, []);

  const subject = String(payload?.subject || "").trim();
  const html = String(payload?.html || "");
  const to = String(payload?.to || "").trim();

  const createdAtLabel = useMemo(() => {
    const ts = payload?.created_at;
    if (!ts || typeof ts !== "number") return "";
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return "";
    }
  }, [payload?.created_at]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="text-sm text-gray-600">
              <Link className="underline" href="/admin">
                Back to Admin
              </Link>
              {createdAtLabel ? <span> • Generated {createdAtLabel}</span> : null}
            </div>
            <div className="text-xl font-semibold">
              {subject ? subject : "Email Preview"}
            </div>
            {to ? <div className="text-sm text-gray-600">To: {to}</div> : null}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded bg-gray-800 text-white disabled:opacity-50"
              onClick={async () => {
                if (!html) return;
                try {
                  await navigator.clipboard.writeText(html);
                } catch {}
              }}
              disabled={!html}
            >
              Copy HTML
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded bg-white border"
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
          </div>
        </div>

        {error ? (
          <div className="p-3 text-red-700 bg-red-50 rounded border border-red-300">
            {error}
          </div>
        ) : null}

        {!html ? (
          <div className="p-4 bg-white rounded border text-sm text-gray-600">
            No email preview data found. Go back to Admin → Emails and click Preview.
          </div>
        ) : (
          <div className="bg-white rounded border overflow-hidden">
            <iframe
              title="Email preview"
              className="w-full"
              style={{ height: "80vh" }}
              srcDoc={html}
              sandbox=""
            />
          </div>
        )}
      </div>
    </div>
  );
}

