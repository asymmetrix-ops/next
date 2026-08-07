"use client";

import { Suspense, useLayoutEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { authService } from "@/lib/auth";
import { trackError, trackLogin } from "@/lib/tracking";

function SsoCompleteContent() {
  const searchParams = useSearchParams();
  const { setShowLoginModal } = useAuth();

  useLayoutEffect(() => {
    setShowLoginModal(false);

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
          window.location.replace("/login?error=sso_sync");
        }
      }
    };

    void complete();

    return () => {
      cancelled = true;
    };
  }, [searchParams, setShowLoginModal]);

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
