"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import PageSkeleton from "@/components/PageSkeleton";

/**
 * Two responsibilities:
 *
 * 1. While the login modal is visible, render a path-aware PageSkeleton instead
 *    of the actual page children.  This previews the content layout so the user
 *    understands what they're about to unlock, and avoids firing API calls
 *    before a valid token exists.
 *
 * 2. After a successful login, bump `loginVersion` causes React to treat the
 *    inner div as a new element (changed key), fully remounting the page and
 *    re-running all useEffect API calls with the now-valid auth token.
 *
 * `display: contents` keeps the wrapper div invisible to CSS layout.
 */
export default function PageRemountOnLogin({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loginVersion, showLoginModal } = useAuth();
  const pathname = usePathname();

  if (showLoginModal) {
    return <PageSkeleton pathname={pathname ?? "/"} />;
  }

  return (
    <div key={loginVersion} style={{ display: "contents" }}>
      {children}
    </div>
  );
}
