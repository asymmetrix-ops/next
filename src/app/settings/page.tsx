"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { PlatformCurrencySettings } from "@/components/settings/PlatformCurrencySettings";
import { EmailPreferencesSection } from "@/components/settings/EmailPreferencesSection";
import AppShell from "@/components/layout/AppShell";

export default function SettingsPage() {
  const { user } = useAuth();
  const userId = Number.parseInt(user?.id || "", 10);

  return (
    <AppShell>
      <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1080px] mx-auto px-4 py-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center h-[26px] px-3 rounded-full bg-blue-50 border border-blue-100 text-[11px] font-extrabold uppercase tracking-wide text-blue-600">
              Account
            </span>
            <h1 className="mt-1.5 text-2xl font-extrabold text-gray-900">
              Settings
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Platform-wide preferences and the emails that reach your
              inbox.
            </p>
          </div>
          <a
            href="/my-info"
            className="shrink-0 px-4 py-2 text-sm font-semibold text-blue-600 bg-white border border-blue-200 rounded-full hover:bg-blue-50 transition-colors"
          >
            My Info
          </a>
        </div>

        <PlatformCurrencySettings />

        {Number.isFinite(userId) && <EmailPreferencesSection userId={userId} />}
      </div>
      </div>
    </AppShell>
  );
}
