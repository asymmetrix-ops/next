"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { authService } from "@/lib/auth";
import { trackError, trackLogin } from "@/lib/tracking";

function SsoCompleteContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
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
        trackError(`Azure SSO completion failed: ${(err as Error)?.message || "unknown"}`);
        if (!cancelled) {
          window.location.replace("/login?sso_error=Azure%20SSO%20sign-in%20failed");
        }
      }
    };

    void complete();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

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
