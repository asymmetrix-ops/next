"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { emailAlertsService } from "@/lib/emailAlertsService";
import type { EmailAlert, EmailAlertsMeta } from "@/types/emailAlerts";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AlertCard } from "@/components/settings/AlertCard";
import { EditAlertModal } from "@/components/settings/EditAlertModal";
import Header from "@/components/Header";

type AuthMeResponse = {
  id: number;
  created_at?: number;
  name?: string;
  email?: string;
  Company?: number | string | null;
  Status?: string;
  status?: string;
  _new_company?: {
    id: number;
    name?: string;
  } | null;
};

export default function SettingsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<EmailAlert[]>([]);
  const [meta, setMeta] = useState<EmailAlertsMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingAlert, setEditingAlert] = useState<EmailAlert | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [sendTogether, setSendTogether] = useState(true);
  const [me, setMe] = useState<AuthMeResponse | null>(null);
  const [meLoading, setMeLoading] = useState(true);
  const [meError, setMeError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setMe(null);
      setMeLoading(false);
      setMeError(null);
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        setMeLoading(true);
        setMeError(null);

        const resp = await fetch("/api/auth-me", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!resp.ok) {
          const body = (await resp.json().catch(() => null)) as
            | { error?: string; message?: string }
            | null;
          throw new Error(body?.error || body?.message || "Failed to load user info");
        }

        const data = (await resp.json()) as AuthMeResponse;
        setMe(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("Error loading auth/me:", err);
        setMeError(err instanceof Error ? err.message : "Failed to load user info");
        setMe(null);
      } finally {
        setMeLoading(false);
      }
    })();

    return () => controller.abort();
  }, [user?.id]);

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
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="w-full px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Notification Preferences
          </h1>
          <p className="text-gray-600">
            Manage your email notification preferences for corporate events and
            insights.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Your Info</h2>
            {meLoading && (
              <span className="text-sm text-gray-500">Loading…</span>
            )}
          </div>

          {meError && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
              <p className="font-semibold">Error</p>
              <p>{meError}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="text-gray-900">
                {me?.name || user?.name || "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email Address</p>
              <p className="text-gray-900">
                {me?.email || user?.email || "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Company</p>
              <p className="text-gray-900">
                {me?._new_company?.name ||
                  (me?.Company != null ? String(me.Company) : null) ||
                  "—"}
              </p>
            </div>
          </div>
        </div>

        {isLoading && <LoadingSpinner />}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
            <p className="font-semibold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {!isLoading && !error && (
          <>
            {canSendTogether && (
              <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    checked={sendTogether}
                    onChange={(e) => setSendTogether(e.target.checked)}
                  />
                  <div>
                    <p className="text-gray-900 font-medium">
                      Send Corporate Events and Insights &amp; Analysis together
                    </p>
                    <p className="text-gray-600 text-sm">
                      Available because both are set to{" "}
                      <span className="font-medium">
                        {corporateAlert?.email_frequency}
                      </span>
                      . Default is on.
                    </p>
                  </div>
                </label>
              </div>
            )}

            {alerts.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
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
              <>
                <div className="mb-4 flex justify-end">
                  <button
                    onClick={() => setIsCreating(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Email Alert
                  </button>
                </div>
                <div className="space-y-4">
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
                </div>
              </>
            )}
          </>
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
                  day_of_week: "",
                  timezone: "Europe/London",
                  content_type: "",
                  is_active: true,
                  send_time_local: defaultTime,
                  next_run_at_utc: null,
                  last_sent_at_utc: null,
                  status: "scheduled",
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
  );
}

