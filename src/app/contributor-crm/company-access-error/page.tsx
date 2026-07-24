"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { buildContributorLoginPath } from "@/lib/contributorCrm/auth";

function parseCompanyId(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function CompanyAccessErrorPageInner() {
  const searchParams = useSearchParams();
  const companyId = useMemo(
    () => parseCompanyId(searchParams.get("companyId")),
    [searchParams]
  );
  const backHref = buildContributorLoginPath(companyId);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F9FAFC] px-6">
      <div className="w-full max-w-[560px] rounded-2xl border border-[#E5E7EB] bg-white p-8 text-center shadow-sm">
        <h1 className="mb-3 text-3xl font-semibold text-[#0F172A]">
          Company access unavailable
        </h1>
        <p className="mb-6 text-sm leading-6 text-[#64748B]">
          We could not match your sign-in email to the company linked in your
          invitation. Please use your work email for that company or reach out
          to us for support.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href={backHref}
            className="rounded-lg bg-[#0F172A] px-5 py-2.5 text-sm font-medium text-white no-underline"
          >
            Try again
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function CompanyAccessErrorPage() {
  return (
    <Suspense>
      <CompanyAccessErrorPageInner />
    </Suspense>
  );
}
