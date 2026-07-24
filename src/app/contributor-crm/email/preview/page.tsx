"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  EMAIL_PREVIEW_STORAGE_KEY,
  type EmailPreviewPayload,
} from "@/lib/contributorCrm/email";

export default function EmailPreviewPage() {
  const [payload, setPayload] = useState<EmailPreviewPayload | null>(null);

  const load = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(EMAIL_PREVIEW_STORAGE_KEY);
      const data = raw ? (JSON.parse(raw) as EmailPreviewPayload) : null;
      setPayload(data);
    } catch {
      setPayload(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (payload === null) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] p-8 font-mono text-[#e8e8e8]">
        <p className="text-[#666]">No preview data. Create an email in the CRM and use Preview.</p>
        <Link
          href="/contributor-crm/internal-crm"
          className="mt-4 inline-block text-sm text-[#60a5fa] hover:underline"
        >
          Back to Internal CRM
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] p-6 font-mono text-[#e8e8e8]">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-white">
              Email preview
            </h1>
            <p className="mt-1 text-sm text-[#555]">Subject: {payload.subject}</p>
            {payload.fromName && (
              <p className="text-sm text-[#555]">
                From: {payload.fromName}
                {payload.from && ` &lt;${payload.from}&gt;`}
              </p>
            )}
            {payload.to && (
              <p className="text-sm text-[#555]">
                To: {payload.toName ?? payload.to}
                {payload.toName && ` <${payload.to}>`}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (payload.html) {
                  navigator.clipboard
                    .writeText(payload.html)
                    .then(() => toast.success("HTML copied"))
                    .catch(() => toast.error("Copy failed"));
                }
              }}
              className="rounded-md border border-[#333] px-3 py-1.5 text-xs text-[#e8e8e8] hover:bg-[#222]"
            >
              Copy HTML
            </button>
            <Link
              href="/contributor-crm/internal-crm"
              className="rounded-md border border-[#333] px-3 py-1.5 text-xs text-[#e8e8e8] hover:bg-[#222]"
            >
              Back to Admin
            </Link>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-[#2a2a2a] bg-white">
          <iframe
            title="Email preview"
            srcDoc={payload.html}
            className="h-[80vh] w-full border-0"
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
