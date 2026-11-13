"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { authService } from "@/lib/auth";
import { SSO_ACCOUNT_DISABLED_MESSAGE } from "@/lib/deviceAuth";
import { trackError, trackLogin } from "@/lib/tracking";

function SsoCompleteContent() {
  const searchParams = useSearchParams();
  const refused = searchParams.get("refused") === "1";
  const [phase, setPhase] = useState<"refused" | "loading" | "failed">(
    refused ? "refused" : "loading"
  );

  useEffect(() => {
    if (refused) return;

    let cancelled = false;

    const complete = async () => {
      try {
        const response = await authService.completeSsoFromCookie();
        const userId = Number(response.user.id) || 0;
        trackLogin(userId);

        const nextPath = searchParams.get("next");
        const destination =
          nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
            ? nextPath
            : "/home-user";

        if (!cancelled) {
          window.location.replace(destination);
        }
      } catch (err) {
        trackError(`SSO completion failed: ${(err as Error)?.message || "unknown"}`);
        if (!cancelled) {
          setPhase("failed");
        }
      }
    };

    void complete();

    return () => {
      cancelled = true;
    };
  }, [refused, searchParams]);

  if (phase === "refused" || phase === "failed") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F9FAFC] px-6">
        <div className="p-8 w-full max-w-md text-center bg-white rounded-xl border border-gray-200 shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">
            Sign-in unavailable
          </h1>
          <p className="mt-3 text-sm text-gray-600">
            {SSO_ACCOUNT_DISABLED_MESSAGE}
          </p>
          <Link
            href="/login"
            className="inline-block mt-6 px-4 py-2.5 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Return to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F9FAFC]">
      <p className="text-gray-600">Completing sign-in...</p>
    </div>
  );
}

export default function SsoCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-[#F9FAFC]">
          <p className="text-gray-600">Completing sign-in...</p>
        </div>
      }
    >
      <SsoCompleteContent />
    </Suspense>
  );
}
