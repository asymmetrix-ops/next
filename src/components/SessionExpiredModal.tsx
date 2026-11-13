"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authService } from "@/lib/auth";
import {
  SESSION_EXPIRED_EVENT,
  installFetchAuthGuard,
  installSessionWatcher,
  resetSessionExpiredFlag,
} from "@/lib/sessionExpired";

// Auth pages and public marketing pages: a stale token's 401 must not pop a login window here.
const PATHS_WITHOUT_MODAL = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/about-us",
  "/contact-us",
  "/press-releases",
  "/privacy-policy",
  "/terms-and-conditions",
];

export default function SessionExpiredModal() {
  const [open, setOpen] = useState(false);
  const [neutralCopy, setNeutralCopy] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    installFetchAuthGuard();
    installSessionWatcher();

    const handleSessionExpired = () => {
      // Contributor pages are link-based (no login); a failed call must never ask for one.
      if (
        pathname &&
        (PATHS_WITHOUT_MODAL.includes(pathname) || pathname.startsWith("/contributor-crm"))
      ) {
        resetSessionExpiredFlag();
        return;
      }
      // Snapshot SSO flag before logout clears stored user — SSO sessions have no
      // device_id; use neutral copy on the login page (?expired=sso).
      const isSsoSession = authService.getUser()?.sso_required === true;
      setNeutralCopy(isSsoSession);
      authService.logout();
      setOpen(true);
      // Redirect automatically; the modal stays as a fallback while navigation happens.
      const back = `${window.location.pathname}${window.location.search}`;
      resetSessionExpiredFlag();
      const expiredFlag = isSsoSession ? "sso" : "1";
      router.replace(
        `/login?redirect=${encodeURIComponent(back)}&expired=${expiredFlag}`
      );
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () =>
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, [pathname, router]);

  // Hide the notice once we have arrived on the login page.
  useEffect(() => {
    if (open && pathname === "/login") setOpen(false);
  }, [open, pathname]);

  if (!open) return null;

  const heading = neutralCopy ? "Session ended" : "Session expired";
  const body = neutralCopy
    ? "Your session has ended. Please sign in again to continue."
    : "Your session has expired. Please log in again to continue.";

  const handleGoToLogin = () => {
    resetSessionExpiredFlag();
    setOpen(false);
    router.replace("/login");
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
          {heading}
        </h2>
        <p className="mt-2 text-sm text-gray-600">{body}</p>
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
