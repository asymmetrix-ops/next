"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  ContentInsightsTab,
  PageInsightsTab,
  UserActivityTab,
} from "./_components/AnalyticsViews";

type AnalyticsTab = "user-activity" | "content-insights" | "page-insights";

const ALLOWED_ANALYTICS_EMAILS = new Set<string>([
  "j.bochner@asymmetrixintelligence.com",
  "a.boden@asymmetrixintelligence.com",
  "a.boden@gmail.com",
]);

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();

  const [activeTab, setActiveTab] = useState<AnalyticsTab>("user-activity");

  const isAdmin = useMemo(() => {
    if (!user) return false;
    const status = (
      user.Status ??
      user.status ??
      user.role ??
      ""
    ).toString().toLowerCase();
    if (status === "admin") return true;
    const roles = (user.roles ?? []).map((r) => String(r).toLowerCase());
    return roles.includes("admin");
  }, [user]);

  const email = (user?.email ?? "").toString().trim().toLowerCase();
  const isAllowedEmail = !!email && ALLOWED_ANALYTICS_EMAILS.has(email);

  const canAccess = !loading && !!user && isAuthenticated && isAdmin && isAllowedEmail;

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!isAllowedEmail) {
      router.replace("/admin");
      return;
    }
    if (!isAdmin) {
      router.replace("/");
    }
  }, [isAuthenticated, isAllowedEmail, isAdmin, loading, router]);

  if (!canAccess) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div>{loading ? "Loading…" : "Access denied."}</div>
      </div>
    );
  }

  return (
    <div className="px-4 py-10 w-full max-w-none min-h-screen">
      <div className="flex items-baseline justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <Link href="/admin" className="text-sm text-blue-600 hover:underline">
          Back to Admin
        </Link>
      </div>

      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab("user-activity")}
          className={`px-3 py-2 -mb-px border-b-2 ${
            activeTab === "user-activity"
              ? "border-black font-medium"
              : "border-transparent text-gray-500"
          }`}
        >
          User Activity
        </button>
        <button
          onClick={() => setActiveTab("content-insights")}
          className={`px-3 py-2 -mb-px border-b-2 ${
            activeTab === "content-insights"
              ? "border-black font-medium"
              : "border-transparent text-gray-500"
          }`}
        >
          Content Insights
        </button>
        <button
          onClick={() => setActiveTab("page-insights")}
          className={`px-3 py-2 -mb-px border-b-2 ${
            activeTab === "page-insights"
              ? "border-black font-medium"
              : "border-transparent text-gray-500"
          }`}
        >
          Page Insights
        </button>
      </div>

      {activeTab === "user-activity" && <UserActivityTab />}
      {activeTab === "content-insights" && <ContentInsightsTab />}
      {activeTab === "page-insights" && <PageInsightsTab />}
    </div>
  );
}

