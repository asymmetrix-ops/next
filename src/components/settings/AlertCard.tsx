"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { EmailAlert, EmailAlertsMeta } from "@/types/emailAlerts";

interface AlertCardProps {
  alert: EmailAlert;
  meta: EmailAlertsMeta | null;
  onEdit: (alert: EmailAlert) => void;
  onDelete: (alertId: number) => void;
  onToggleActive: (alert: EmailAlert) => void;
}

export function AlertCard({
  alert,
  meta,
  onEdit,
  onDelete,
  onToggleActive,
}: AlertCardProps) {
  const getItemTypeLabel = () => {
    if (!meta) return alert.item_type;
    const option = meta.enums.item_type.find(
      (opt) => opt.value === alert.item_type
    );
    return option?.label || alert.item_type;
  };

  const getFrequencyLabel = () => {
    if (!meta) return alert.email_frequency;
    const option = meta.enums.email_frequency.find(
      (opt) => opt.value === alert.email_frequency
    );
    return option?.label || alert.email_frequency;
  };

  const getDayOfWeekLabel = () => {
    if (!alert.day_of_week || !meta) return "";
    const option = meta.enums.day_of_week.find(
      (opt) => opt.value === alert.day_of_week
    );
    return option?.label || alert.day_of_week;
  };

  const getContentTypeLabel = () => {
    if (!alert.content_type || !meta) return "";
    const option = meta.enums.content_type.find(
      (opt) => opt.value === alert.content_type
    );
    return option?.label || alert.content_type;
  };

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return "";
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return "";
    }
  };

  const buildDescription = () => {
    const parts: string[] = [];
    parts.push(getItemTypeLabel());
    parts.push("—");
    
    // Build frequency part with optional details
    if (alert.email_frequency === "as_added") {
      parts.push(getFrequencyLabel());
      
      // For insights_analysis + as_added, add content type
      if (
        alert.item_type === "insights_analysis" &&
        alert.content_type
      ) {
        const contentTypeLabel = getContentTypeLabel();
        if (contentTypeLabel) {
          parts.push("—");
          parts.push(contentTypeLabel);
        }
      }
    } else if (alert.email_frequency === "daily") {
      parts.push(getFrequencyLabel());
      
      // For daily, add time and timezone in parentheses
      const timeDetails: string[] = [];
      if (alert.send_time_local) {
        const time = formatTime(alert.send_time_local);
        if (time) {
          timeDetails.push(time);
        }
      }
      if (alert.timezone) {
        timeDetails.push(alert.timezone);
      }
      
      if (timeDetails.length > 0) {
        parts.push(`(${timeDetails.join(" ")})`);
      }
    } else if (alert.email_frequency === "weekly") {
      // For weekly, format: "Weekly (Mon 10:00 Europe/London)"
      const weeklyDetails: string[] = [];
      
      if (alert.day_of_week) {
        const dayLabel = getDayOfWeekLabel();
        if (dayLabel) {
          // Abbreviate day name (e.g., "Monday" -> "Mon")
          const dayAbbr = dayLabel.slice(0, 3);
          weeklyDetails.push(dayAbbr);
        }
      }
      
      if (alert.send_time_local) {
        const time = formatTime(alert.send_time_local);
        if (time) {
          weeklyDetails.push(time);
        }
      }
      
      if (alert.timezone) {
        weeklyDetails.push(alert.timezone);
      }
      
      if (weeklyDetails.length > 0) {
        parts.push(`${getFrequencyLabel()} (${weeklyDetails.join(" ")})`);
      } else {
        parts.push(getFrequencyLabel());
      }
    } else {
      parts.push(getFrequencyLabel());
    }

    parts.push("—");
    parts.push(alert.is_active ? "Active" : "Inactive");

    return parts.join(" ");
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-gray-900 font-medium mb-1">
              {buildDescription()}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={alert.is_active}
                onChange={() => onToggleActive(alert)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">
                {alert.is_active ? "Active" : "Inactive"}
              </span>
            </label>
            <button
              onClick={() => onEdit(alert)}
              className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(alert.id)}
              className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

