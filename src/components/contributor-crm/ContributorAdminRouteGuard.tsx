"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  authService,
  buildTeamLoginPath,
  contributorAccessService,
  isAdminUser,
} from "@/lib/contributorCrm/auth";

function ContributorAdminRouteGuardInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const token = authService.getAuthToken();
    const user = authService.getUser();

    if (!token || !user) {
      const query = searchParams.toString();
      const returnPath = `${pathname}${query ? `?${query}` : ""}`;
      router.replace(
        `${buildTeamLoginPath()}?redirect=${encodeURIComponent(returnPath)}`
      );
      return;
    }

    if (!isAdminUser(user)) {
      const boundCompanyId = contributorAccessService.getCompanyId();
      router.replace(
        boundCompanyId != null
          ? `/contributor-crm/${boundCompanyId}`
          : "/contributor-crm/home-user"
      );
      return;
    }

    setAllowed(true);
  }, [pathname, router, searchParams]);

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}

export default function ContributorAdminRouteGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">
          Loading…
        </div>
      }
    >
      <ContributorAdminRouteGuardInner>{children}</ContributorAdminRouteGuardInner>
    </Suspense>
  );
}
