"use client";

import { useMemo, useState, useEffect } from "react";
import type { EmailAlert, EmailAlertsMeta } from "@/types/emailAlerts";
import { computeNextRunAtUtcIso } from "@/utils/emailAlertSchedule";

interface EditAlertModalProps {
  alert: EmailAlert;
  meta: EmailAlertsMeta;
  isOpen: boolean;
  isCreateMode?: boolean;
  onClose: () => void;
  onSave: (alert: EmailAlert) => void;
}

// Common timezones with user-friendly labels
const COMMON_TIMEZONES = [
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "America/New_York", label: "New York (EST/EDT)" },
  { value: "America/Chicago", label: "Chicago (CST/CDT)" },
  { value: "America/Denver", label: "Denver (MST/MDT)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PST/PDT)" },
  { value: "America/Toronto", label: "Toronto (EST/EDT)" },
  { value: "America/Vancouver", label: "Vancouver (PST/PDT)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
  { value: "Europe/Rome", label: "Rome (CET/CEST)" },
  { value: "Europe/Madrid", label: "Madrid (CET/CEST)" },
  { value: "Europe/Amsterdam", label: "Amsterdam (CET/CEST)" },
  { value: "Europe/Zurich", label: "Zurich (CET/CEST)" },
  { value: "Europe/Stockholm", label: "Stockholm (CET/CEST)" },
  { value: "Europe/Dublin", label: "Dublin (GMT/IST)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Hong_Kong", label: "Hong Kong (HKT)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Mumbai", label: "Mumbai (IST)" },
  { value: "Australia/Sydney", label: "Sydney (AEDT/AEST)" },
  { value: "Australia/Melbourne", label: "Melbourne (AEDT/AEST)" },
  { value: "Pacific/Auckland", label: "Auckland (NZDT/NZST)" },
  { value: "America/Sao_Paulo", label: "São Paulo (BRT/BRST)" },
  { value: "America/Mexico_City", label: "Mexico City (CST/CDT)" },
  { value: "Africa/Johannesburg", label: "Johannesburg (SAST)" },
  { value: "Asia/Seoul", label: "Seoul (KST)" },
  { value: "Asia/Bangkok", label: "Bangkok (ICT)" },
  { value: "UTC", label: "UTC" },
];

export function EditAlertModal({
  alert,
  meta,
  isOpen,
  isCreateMode = false,
  onClose,
  onSave,
}: EditAlertModalProps) {
  // Helper to convert timestamp to HH:mm if needed
  const normalizeTime = (timeValue: string | null | undefined): string | null => {
    if (!timeValue) return null;
    // If already in HH:mm format, return as-is
    if (/^\d{2}:\d{2}$/.test(timeValue)) {
      return timeValue;
    }
    // Otherwise, try to parse as timestamp
    try {
      const date = new Date(timeValue);
      return date.toTimeString().slice(0, 5); // Convert to HH:mm
    } catch {
      return null;
    }
  };

  const [formData, setFormData] = useState<Partial<EmailAlert>>(() => {
    const defaultTime = normalizeTime(meta.defaults.daily_send_time_local) || "09:00";
    return {
      item_type: alert.item_type,
      email_frequency: alert.email_frequency,
      day_of_week: alert.day_of_week || "",
      timezone: alert.timezone || "Europe/London",
      content_type: alert.content_type || "",
      is_active: alert.is_active,
      send_time_local: normalizeTime(alert.send_time_local) || defaultTime,
    };
  });


  useEffect(() => {
    if (isOpen) {
      const defaultTime = normalizeTime(meta.defaults.daily_send_time_local) || "09:00";
      setFormData({
        item_type: alert.item_type,
        email_frequency: alert.email_frequency,
        day_of_week: alert.day_of_week || "",
        timezone: alert.timezone || "Europe/London",
        content_type: alert.content_type || "",
        is_active: alert.is_active,
        send_time_local: normalizeTime(alert.send_time_local) || defaultTime,
      });
    }
  }, [alert, meta, isOpen]);

  const londonTimeHint = useMemo(() => {
    if (!formData.email_frequency || formData.email_frequency === "as_added") return null;
    if (!formData.send_time_local || !formData.timezone) return null;

    const iso = computeNextRunAtUtcIso({
      email_frequency: formData.email_frequency as EmailAlert["email_frequency"],
      day_of_week: (formData.day_of_week || "") as EmailAlert["day_of_week"],
      timezone: formData.timezone,
      send_time_local: formData.send_time_local,
    });
    if (!iso) return null;
    const dt = new Date(iso);
    const london = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(dt);
    return london;
  }, [
    formData.day_of_week,
    formData.email_frequency,
    formData.send_time_local,
    formData.timezone,
  ]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedAlert: EmailAlert = {
      ...alert,
      ...formData,
      day_of_week: formData.day_of_week || "",
      timezone: formData.timezone || "",
      content_type: formData.content_type || "",
      send_time_local: formData.send_time_local || null,
    } as EmailAlert;
    onSave(updatedAlert);
  };

  const formatTimeForInput = (timeValue: string | null) => {
    if (!timeValue) return "";
    // If it's already in HH:mm format, return as-is
    if (/^\d{2}:\d{2}$/.test(timeValue)) {
      return timeValue;
    }
    // Otherwise, try to parse as timestamp (for backward compatibility)
    try {
      const date = new Date(timeValue);
      return date.toTimeString().slice(0, 5); // HH:mm format
    } catch {
      return "";
    }
  };

  const handleTimeChange = (timeString: string) => {
    if (!timeString) {
      setFormData((prev) => ({ ...prev, send_time_local: null }));
      return;
    }
    // Store directly as HH:mm format (e.g., "10:00")
    setFormData((prev) => ({
      ...prev,
      send_time_local: timeString,
    }));
  };

  const showDayOfWeek = formData.email_frequency === "weekly";
  const isAsAdded = formData.email_frequency === "as_added";
  const showContentType =
    formData.item_type === "insights_analysis" && isAsAdded;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          padding: "24px",
          maxWidth: "600px",
          width: "90%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            fontSize: "20px",
            fontWeight: "700",
            color: "#1a202c",
            marginBottom: "20px",
            marginTop: "0",
          }}
        >
          {isCreateMode ? "Create Email Alert" : "Edit Email Alert"}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Item Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item Type
              </label>
              <select
                value={formData.item_type}
                onChange={(e) => {
                  const newItemType = e.target.value as EmailAlert["item_type"];
                  setFormData((prev) => {
                    const newData = {
                      ...prev,
                      item_type: newItemType,
                    };
                    // Clear content_type if not insights_analysis or not as_added
                    if (
                      newItemType !== "insights_analysis" ||
                      prev.email_frequency !== "as_added"
                    ) {
                      newData.content_type = "";
                    }
                    return newData;
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {meta.enums.item_type.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Email Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frequency
              </label>
              <select
                value={formData.email_frequency}
                onChange={(e) => {
                  const newFrequency = e.target.value as EmailAlert["email_frequency"];
                  setFormData((prev) => {
                    const newData = {
                      ...prev,
                      email_frequency: newFrequency,
                    };
                    // Clear content_type if not as_added or not insights_analysis
                    if (
                      newFrequency !== "as_added" ||
                      prev.item_type !== "insights_analysis"
                    ) {
                      newData.content_type = "";
                    }
                    // Clear day_of_week if not weekly
                    if (newFrequency !== "weekly") {
                      newData.day_of_week = "";
                    }
                    // Clear send_time_local if as_added
                    if (newFrequency === "as_added") {
                      newData.send_time_local = null;
                    }
                    return newData;
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {meta.enums.email_frequency.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Day of Week (only for weekly) */}
            {showDayOfWeek && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Day of Week
                </label>
                <select
                  value={formData.day_of_week}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, day_of_week: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select day</option>
                  {meta.enums.day_of_week.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Time and Timezone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time
                {isAsAdded && (
                  <span className="text-gray-500 text-xs ml-2">
                    (Not used for &quot;As added&quot; frequency)
                  </span>
                )}
              </label>
              <input
                type="time"
                value={formatTimeForInput(formData.send_time_local || null)}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                disabled={isAsAdded}
                required={!isAsAdded}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timezone
              </label>
              <select
                value={formData.timezone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, timezone: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
              {londonTimeHint && (
                <p className="text-xs text-gray-500 mt-1">
                  London equivalent for next run:{" "}
                  <span className="font-medium text-gray-700">{londonTimeHint}</span>
                </p>
              )}
            </div>

            {/* Content Type (only for insights_analysis + as_added) */}
            {showContentType && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content Type
                </label>
                <select
                  value={formData.content_type}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, content_type: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select content type</option>
                  {meta.enums.content_type.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Active Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, is_active: e.target.checked }))
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700">
                Active
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {isCreateMode ? "Create" : "Save"}
              </button>
          </div>
        </form>
      </div>
    </div>
  );
}

