"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function UnsubscribeInner() {
  const token = useSearchParams().get("t") ?? "";
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  async function confirm() {
    setState("busy");
    const res = await fetch("/contributor-crm/api/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ t: token }),
    }).catch(() => null);
    setState(res?.ok ? "done" : "error");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F9FAFC] px-6">
      <div className="w-full max-w-[520px] rounded-2xl border border-[#E5E7EB] bg-white p-8 text-center shadow-sm">
        <h1 className="mb-3 text-2xl font-semibold text-[#0F172A]">Unsubscribe</h1>
        {state === "done" ? (
          <p className="text-sm leading-6 text-[#64748B]">
            You have been unsubscribed. You will not receive these emails again.
          </p>
        ) : (
          <>
            <p className="mb-6 text-sm leading-6 text-[#64748B]">
              Confirm that you no longer want to receive data review emails from Asymmetrix.
              {state === "error" && (
                <span className="mt-2 block text-red-600">
                  Something went wrong. The link may be invalid; please reply to the email instead.
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={confirm}
              disabled={!token || state === "busy"}
              className="rounded-lg bg-[#0F172A] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {state === "busy" ? "Unsubscribing…" : "Unsubscribe"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={null}>
      <UnsubscribeInner />
    </Suspense>
  );
}
