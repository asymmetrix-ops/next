"use client";

import type { EmailAlert, EmailAlertsMeta } from "@/types/emailAlerts";
import {
  isCeDealTypeFilterActive,
  isCeFundingStageFilterActive,
  isCorporateEventsEmailAlert,
} from "@/lib/ceEmailAlertFilters";

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

  const formatTime = (timeValue: string | null) => {
    if (!timeValue) return "";
    // If it's already in HH:mm format, return as-is
    if (/^\d{2}:\d{2}$/.test(timeValue)) {
      return timeValue;
    }
    // Otherwise, try to parse as timestamp (for backward compatibility)
    try {
      const date = new Date(timeValue);
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return "";
    }
  };

  const getFrequencyDetail = (): string => {
    if (alert.email_frequency === "as_added") {
      if (alert.item_type === "insights_analysis" && alert.content_type) {
        const contentTypeLabel = getContentTypeLabel();
        return contentTypeLabel || "";
      }
      return "";
    }
    if (alert.email_frequency === "daily") {
      const timeDetails: string[] = [];
      const time = formatTime(alert.send_time_local);
      if (time) timeDetails.push(time);
      if (alert.timezone) timeDetails.push(alert.timezone);
      return timeDetails.join(" ");
    }
    if (alert.email_frequency === "weekly") {
      const weeklyDetails: string[] = [];
      const dayLabel = getDayOfWeekLabel();
      if (dayLabel) weeklyDetails.push(dayLabel.slice(0, 3));
      const time = formatTime(alert.send_time_local);
      if (time) weeklyDetails.push(time);
      if (alert.timezone) weeklyDetails.push(alert.timezone);
      return weeklyDetails.join(" ");
    }
    return "";
  };

  const getFilterSummary = (): { label: string; hasFilter: boolean } => {
    const f = alert.filters;
    const filterParts: string[] = [];
    if (f?.companies?.length) filterParts.push(`${f.companies.length} companies`);
    if (f?.sectors?.length) filterParts.push(`${f.sectors.length} sectors`);
    if (f?.individuals?.length) filterParts.push(`${f.individuals.length} individuals`);
    if (f?.investors?.length) filterParts.push(`${f.investors.length} investors`);
    if (f?.advisors?.length) filterParts.push(`${f.advisors.length} advisors`);
    if (isCorporateEventsEmailAlert(alert.item_type)) {
      if (isCeDealTypeFilterActive(f?.deal_types)) {
        filterParts.push(`${f!.deal_types!.length} deal types`);
      }
      if (isCeFundingStageFilterActive(f?.funding_stages)) {
        filterParts.push(`${f!.funding_stages!.length} funding stages`);
      }
    }
    return filterParts.length === 0
      ? { label: "No filter", hasFilter: false }
      : { label: filterParts.join(", "), hasFilter: true };
  };

  const frequencyDetail = getFrequencyDetail();
  const filterSummary = getFilterSummary();

  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
      <td className="py-3.5 px-4 align-middle">
        <span className="block text-sm font-semibold text-gray-900">
          {getItemTypeLabel()}
        </span>
        <span className="block text-xs text-gray-500 mt-0.5">
          {alert.item_type === "corporate_events"
            ? "M&A, investments, partnerships"
            : "Everything you follow"}
        </span>
      </td>
      <td className="py-3.5 px-4 align-middle">
        <span className="block text-sm text-gray-900">
          {getFrequencyLabel()}
        </span>
        {frequencyDetail && (
          <span className="block text-xs text-gray-500 mt-0.5">
            {frequencyDetail}
          </span>
        )}
      </td>
      <td className="py-3.5 px-4 align-middle">
        <span
          className={`inline-flex items-center h-[22px] px-2.5 rounded-full text-xs font-semibold whitespace-nowrap ${
            filterSummary.hasFilter
              ? "bg-blue-50 text-blue-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {filterSummary.label}
        </span>
      </td>
      <td className="py-3.5 px-4 align-middle">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <span className="relative inline-flex h-5 w-9 items-center">
            <input
              type="checkbox"
              checked={alert.is_active}
              onChange={() => onToggleActive(alert)}
              className="peer sr-only"
            />
            <span className="absolute inset-0 rounded-full bg-gray-300 transition-colors peer-checked:bg-blue-600" />
            <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
          </span>
          <span className="text-xs text-gray-600">
            {alert.is_active ? "Active" : "Inactive"}
          </span>
        </label>
      </td>
      <td className="py-3.5 px-4 align-middle text-right whitespace-nowrap">
        <button
          type="button"
          onClick={() => onEdit(alert)}
          className="text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(alert.id)}
          className="ml-3.5 text-sm font-semibold text-red-600 hover:text-red-700"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}

