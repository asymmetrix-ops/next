"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { emailAlertsService } from "@/lib/emailAlertsService";
import type { EmailAlert, EmailAlertsMeta } from "@/types/emailAlerts";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AlertCard } from "@/components/settings/AlertCard";
import { EditAlertModal } from "@/components/settings/EditAlertModal";
import Header from "@/components/Header";

export default function SettingsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<EmailAlert[]>([]);
  const [meta, setMeta] = useState<EmailAlertsMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingAlert, setEditingAlert] = useState<EmailAlert | null>(null);
  const [isCreating, setIsCreating] = useState(false);

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

        {isLoading && <LoadingSpinner />}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
            <p className="font-semibold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {!isLoading && !error && (
          <>
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
                  timezone: meta.defaults.timezone,
                  content_type: "",
                  is_active: true,
                  send_time_local: defaultTime,
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

