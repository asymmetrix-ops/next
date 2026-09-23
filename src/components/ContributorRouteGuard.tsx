"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { CONTRIBUTOR_CRM_PATH } from "@/lib/userStatus";

export default function ContributorRouteGuard() {
  const { isContributor, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!pathname || loading || !isContributor) return;

    const onContributorCrm =
      pathname === CONTRIBUTOR_CRM_PATH ||
      pathname.startsWith(`${CONTRIBUTOR_CRM_PATH}/`);

    if (!onContributorCrm) {
      router.replace(CONTRIBUTOR_CRM_PATH);
    }
  }, [isContributor, loading, pathname, router]);

  return null;
}
