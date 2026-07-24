"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  authService,
  buildContributorEntryPath,
  contributorAccessService,
  isAdminUser,
} from "@/lib/contributorCrm/auth";

function parseCompanyId(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function ContributorCrmPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitedCompanyId = useMemo(
    () => parseCompanyId(searchParams.get("companyId")),
    [searchParams]
  );
  const shouldOpenReview = searchParams.get("review") === "1";

  useEffect(() => {
    const token = authService.getAuthToken();
    const user = authService.getUser();
    const boundCompanyId = contributorAccessService.getCompanyId();

    if (invitedCompanyId != null) {
      contributorAccessService.setExpectedCompanyId(invitedCompanyId);
    }

    if (!token) {
      if (invitedCompanyId != null) {
        router.replace(
          buildContributorEntryPath(invitedCompanyId, { review: shouldOpenReview })
        );
        return;
      }
      router.replace("/contributor-crm/login");
      return;
    }

    if (user && !isAdminUser(user)) {
      router.replace("/contributor-crm/home-user");
      return;
    }

    if (invitedCompanyId != null) {
      if (user && isAdminUser(user)) {
        const params = shouldOpenReview ? "?review=1" : "";
        router.replace(`/contributor-crm/${invitedCompanyId}${params}`);
        return;
      }
      if (boundCompanyId === invitedCompanyId) {
        const params = shouldOpenReview ? "?review=1" : "";
        router.replace(`/contributor-crm/${invitedCompanyId}${params}`);
        return;
      }
      router.replace(
        buildContributorEntryPath(invitedCompanyId, { review: shouldOpenReview })
      );
      return;
    }

    if (boundCompanyId != null) {
      router.replace(`/contributor-crm/${boundCompanyId}`);
      return;
    }
    if (user && isAdminUser(user)) {
      router.replace("/contributor-crm/internal-crm");
      return;
    }
    router.replace("/contributor-crm/home-user");
  }, [invitedCompanyId, router, shouldOpenReview]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0f0f] text-[#e8e8e8]">
      <div className="text-sm text-gray-500">Redirecting...</div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense>
      <ContributorCrmPageInner />
    </Suspense>
  );
}
