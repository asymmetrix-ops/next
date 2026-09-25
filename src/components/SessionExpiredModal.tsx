"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authService } from "@/lib/auth";
import {
  SESSION_EXPIRED_EVENT,
  installFetchAuthGuard,
  resetSessionExpiredFlag,
} from "@/lib/sessionExpired";

const PATHS_WITHOUT_MODAL = ["/login", "/signup"];

export default function SessionExpiredModal() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    installFetchAuthGuard();

    const handleSessionExpired = () => {
      if (pathname && PATHS_WITHOUT_MODAL.includes(pathname)) return;
      authService.logout();
      setOpen(true);
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () =>
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, [pathname]);

  if (!open) return null;

  const handleGoToLogin = () => {
    resetSessionExpiredFlag();
    setOpen(false);
    router.push("/login");
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
    >
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h2 id="session-expired-title" className="text-lg font-semibold text-gray-900">
          Session expired
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Your session has expired. Please log in again to continue.
        </p>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={handleGoToLogin}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Log in
          </button>
        </div>
      </div>
    </div>
  );
}
