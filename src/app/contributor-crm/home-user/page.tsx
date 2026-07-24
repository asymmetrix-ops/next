"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  authService,
  contributorAccessService,
  isAdminUser,
  type User,
} from "@/lib/contributorCrm/auth";

export default function HomeUserPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [hasLoadedUser, setHasLoadedUser] = useState(false);

  useEffect(() => {
    const loadUser = window.setTimeout(() => {
      setUser(authService.getUser());
      setHasLoadedUser(true);
    }, 0);

    return () => window.clearTimeout(loadUser);
  }, []);

  useEffect(() => {
    if (!hasLoadedUser) return;

    if (!user) {
      router.replace("/contributor-crm/login");
      return;
    }

    if (isAdminUser(user)) {
      router.replace("/contributor-crm/internal-crm");
    }
  }, [hasLoadedUser, router, user]);

  const handleLogout = () => {
    authService.clearUser();
    contributorAccessService.clear();
    router.replace("/contributor-crm/login");
  };

  if (!hasLoadedUser || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9FAFC] text-gray-500">
        Loading...
      </div>
    );
  }

  const boundCompanyId = contributorAccessService.getCompanyId();

  return (
    <div className="min-h-screen bg-[#F9FAFC] px-6 py-12">
      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">
          Asymmetrix
        </p>
        <h1 className="mt-3 text-3xl font-bold text-gray-900">
          Welcome, {user.name || user.email}
        </h1>
        <p className="mt-3 text-gray-600">
          Your standard user dashboard is not built yet.
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Signed in as `{user.email}` for company `{user._new_company?.name ?? "Unknown"}`.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {boundCompanyId != null && (
            <Link
              href={`/contributor-crm/${boundCompanyId}`}
              className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Open Company Portal
            </Link>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="inline-block rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
