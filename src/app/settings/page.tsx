"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { emailAlertsService } from "@/lib/emailAlertsService";
import type { EmailAlert, EmailAlertsMeta } from "@/types/emailAlerts";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AlertCard } from "@/components/settings/AlertCard";
import { EditAlertModal } from "@/components/settings/EditAlertModal";
import { PlatformCurrencySettings } from "@/components/settings/PlatformCurrencySettings";
import AppShell from "@/components/layout/AppShell";

export default function SettingsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<EmailAlert[]>([]);
  const [meta, setMeta] = useState<EmailAlertsMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingAlert, setEditingAlert] = useState<EmailAlert | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [sendTogether, setSendTogether] = useState(true);

  const loadAlerts = useCallback(async (showLoading = true) => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      if (showLoading) {
        setIsLoading(true);
      }
      setError(null);
      const userId = Number.parseInt(user.id, 10);
      if (!Number.isFinite(userId)) {
        throw new Error("Invalid user ID");
      }

      const response = await emailAlertsService.getEmailAlerts(userId);
      setAlerts(response.alerts);
      setMeta(response.meta);
    } catch (err) {
      console.error("Error loading email alerts:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load email alerts"
      );
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [user?.id]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const corporateAlert = alerts.find((a) => a.item_type === "corporate_events");
  const insightsAlert = alerts.find((a) => a.item_type === "insights_analysis");
  const canSendTogether =
    !!corporateAlert &&
    !!insightsAlert &&
    corporateAlert.email_frequency === insightsAlert.email_frequency;

  useEffect(() => {
    if (!user?.id) return;
    if (!canSendTogether) return;
    const key = `emailAlerts:sendTogether:${user.id}`;
    const stored = window.localStorage.getItem(key);
    // Default is ON, unless user explicitly turned it off before.
    setSendTogether(stored == null ? true : stored === "true");
  }, [user?.id, canSendTogether]);

  useEffect(() => {
    if (!user?.id) return;
    if (!canSendTogether) return;
    const key = `emailAlerts:sendTogether:${user.id}`;
    window.localStorage.setItem(key, String(sendTogether));
  }, [user?.id, canSendTogether, sendTogether]);

  const handleEdit = (alert: EmailAlert) => {
    setEditingAlert(alert);
  };

  const handleDelete = async (alertId: number) => {
    if (!confirm("Are you sure you want to delete this email alert?")) {
      return;
    }

    try {
      setError(null);
      await emailAlertsService.deleteEmailAlert(alertId);
      // Refresh alerts list from server (without showing loading spinner)
      await loadAlerts(false);
    } catch (err) {
      console.error("Error deleting alert:", err);
      setError(
        err instanceof Error ? err.message : "Failed to delete email alert"
      );
    }
  };

  const handleToggleActive = async (alert: EmailAlert) => {
    // TODO: Implement toggle when PATCH endpoint is ready
    console.log("Toggle active:", alert);
  };

  const handleModalClose = () => {
    setEditingAlert(null);
    setIsCreating(false);
  };

  const handleModalSave = async (updatedAlert: EmailAlert) => {
    if (isCreating) {
      try {
        setError(null);
        // Wait for POST request to complete
        await emailAlertsService.createEmailAlert(updatedAlert);
        // Only after POST responds, refresh alerts list from server (without showing loading spinner)
        await loadAlerts(false);
        // Close modal only after both POST and GET complete
        setIsCreating(false);
      } catch (err) {
        console.error("Error creating alert:", err);
        setError(
          err instanceof Error ? err.message : "Failed to create email alert"
        );
      }
    } else {
      try {
        setError(null);
        // Wait for PATCH request to complete
        await emailAlertsService.updateEmailAlert(updatedAlert);
        // Only after PATCH responds, refresh alerts list from server (without showing loading spinner)
        await loadAlerts(false);
        // Close modal only after both PATCH and GET complete
        setEditingAlert(null);
      } catch (err) {
        console.error("Error updating alert:", err);
        setError(
          err instanceof Error ? err.message : "Failed to update email alert"
        );
      }
    }
  };

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
              Platform-wide preferences and the email alerts that reach your
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

        {isLoading && <LoadingSpinner />}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
            <p className="font-semibold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {!isLoading && !error && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
            <div className="flex items-baseline gap-3 px-6 py-4 border-b border-gray-100">
              <h2 className="text-[15px] font-bold text-gray-900">
                Email alerts
              </h2>
              <span className="text-xs text-gray-500">
                {alerts.length} active
              </span>
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="ml-auto px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-colors"
              >
                New alert
              </button>
            </div>

            {canSendTogether && (
              <label className="flex items-start gap-3 cursor-pointer px-6 py-4 border-b border-gray-100">
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  checked={sendTogether}
                  onChange={(e) => setSendTogether(e.target.checked)}
                />
                <div>
                  <p className="text-gray-900 font-medium text-sm">
                    Send Corporate Events and Insights &amp; Analysis together
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    Available because both are set to{" "}
                    <span className="font-medium">
                      {corporateAlert?.email_frequency}
                    </span>
                    . Default is on.
                  </p>
                </div>
              </label>
            )}

            {alerts.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-600 mb-4">
                  You don&apos;t have any email alerts configured yet.
                </p>
                <button
                  onClick={() => setIsCreating(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Alert
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left text-[10px] font-extrabold uppercase tracking-wider text-gray-400 py-2.5 px-4">
                      Alert
                    </th>
                    <th className="text-left text-[10px] font-extrabold uppercase tracking-wider text-gray-400 py-2.5 px-4">
                      Frequency
                    </th>
                    <th className="text-left text-[10px] font-extrabold uppercase tracking-wider text-gray-400 py-2.5 px-4">
                      Filter
                    </th>
                    <th className="text-left text-[10px] font-extrabold uppercase tracking-wider text-gray-400 py-2.5 px-4">
                      Status
                    </th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      meta={meta}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onToggleActive={handleToggleActive}
                    />
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        )}

        {(editingAlert || isCreating) && meta && (
          <EditAlertModal
            alert={
              editingAlert ||
              (() => {
                // Convert default timestamp to HH:mm if needed
                let defaultTime = meta.defaults.daily_send_time_local;
                if (defaultTime && !/^\d{2}:\d{2}$/.test(defaultTime)) {
                  try {
                    const date = new Date(defaultTime);
                    defaultTime = date.toTimeString().slice(0, 5); // Convert to HH:mm
                  } catch {
                    defaultTime = "09:00"; // Fallback
                  }
                }
                return {
                  id: 0,
                  created_at: Date.now(),
                  user_id: Number.parseInt(user?.id || "0", 10),
                  item_type: "corporate_events",
                  email_frequency: "daily",
                  day_of_week: null,
                  timezone: "Europe/London",
                  content_type: "digest",
                  is_active: true,
                  send_time_local: defaultTime,
                  next_run_at_utc: null,
                  last_sent_at_utc: null,
                  status: "scheduled",
                  filters: {},
                } as EmailAlert;
              })()
            }
            meta={meta}
            isOpen={!!editingAlert || isCreating}
            isCreateMode={isCreating}
            onClose={handleModalClose}
            onSave={handleModalSave}
          />
        )}
      </div>
      </div>
    </AppShell>
  );
}

