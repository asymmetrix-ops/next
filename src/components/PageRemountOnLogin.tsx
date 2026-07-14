"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import PageSkeleton from "@/components/PageSkeleton";
import ProspectConversionCard from "@/components/ProspectConversionCard";
import { GET_ACCESS_PATH } from "@/lib/prospect";

const PUBLIC_PATHS = [
  "/",
  "/about-us",
  "/login",
  "/trial-expired",
  "/forgot-password",
  "/reset-password",
  GET_ACCESS_PATH,
  "/mcp-guest/login",
];

/**
 * Two responsibilities:
 *
 * 1. While the login modal is visible, render a path-aware PageSkeleton instead
 *    of the actual page children.  This previews the content layout so the user
 *    understands what they're about to unlock, and avoids firing API calls
 *    before a valid token exists.
 *
 *    Prospect users get the same skeleton preview behind the Calendly overlay.
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
  const { loginVersion, showLoginModal, isProspect, prospectEmail, loading } =
    useAuth();
  const pathname = usePathname();

  const isPublicPath = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname?.startsWith(p + "/")
  );

  if (loading && !isPublicPath) {
    return <PageSkeleton pathname={pathname ?? "/"} />;
  }

  if (isProspect && !isPublicPath) {
    return (
      <>
        <PageSkeleton pathname={pathname ?? "/"} />
        <ProspectConversionCard email={prospectEmail} />
      </>
    );
  }

  if (showLoginModal) {
    return <PageSkeleton pathname={pathname ?? "/"} />;
  }

  return (
    <div key={loginVersion} style={{ display: "contents" }}>
      {children}
    </div>
  );
}
