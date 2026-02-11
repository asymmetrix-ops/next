import React from "react";
import type { AdvisorCorporateEvent } from "../../types/advisor";
import {
  formatDate,
  formatCurrency,
  getCounterpartyRole,
  getOtherAdvisorsText,
} from "../../utils/advisorHelpers";

interface CorporateEventsTableProps {
  events: AdvisorCorporateEvent[];
}

export const CorporateEventsTable: React.FC<CorporateEventsTableProps> = ({
  events,
}) => {
  const coerceArray = <T,>(raw: unknown): T[] => {
    if (Array.isArray(raw)) return raw as T[];
    if (raw === null || raw === undefined) return [];
    if (typeof raw !== "string") return [];
    const trimmed = raw.trim();
    if (!trimmed || trimmed === "[]") return [];
    try {
      const normalized = trimmed.replace(/\\u0022/g, '"');
      const parsed = JSON.parse(normalized) as unknown;
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  };

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full border border-gray-300 border-collapse"
        style={{ minWidth: "1050px" }}
      >
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-2 text-left border border-gray-300">
              Description
            </th>
            <th className="px-4 py-2 text-left border border-gray-300">
              Date Announced
            </th>
            <th className="px-4 py-2 text-left border border-gray-300">Type</th>
            <th className="px-4 py-2 text-left border border-gray-300">
              Company Advised
            </th>
            <th className="px-4 py-2 text-left border border-gray-300">
              Enterprise Value
            </th>
            <th className="px-4 py-2 text-left border border-gray-300">
              Individuals
            </th>
            <th className="px-4 py-2 text-left border border-gray-300">
              Other Advisors
            </th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 border border-gray-300">
                <a href="#" className="text-blue-600 hover:underline">
                  {event.description}
                </a>
              </td>
              <td className="px-4 py-2 border border-gray-300 whitespace-nowrap">
                {formatDate(event.announcement_date)}
              </td>
              <td className="px-4 py-2 border border-gray-300">
                {event.deal_type || "Not available"}
              </td>
              <td className="px-4 py-2 border border-gray-300">
                {event.company_advised_name || "Not available"}
                {event.company_advised_role
                  ? ` (${getCounterpartyRole(event)})`
                  : ""}
              </td>
              <td className="px-4 py-2 border border-gray-300">
                {event.enterprise_value_m != null && event.currency_name
                  ? formatCurrency(String(event.enterprise_value_m), event.currency_name)
                  : "Not available"}
              </td>
              <td className="px-4 py-2 border border-gray-300">
                {(() => {
                  const inds = coerceArray<{ id?: number; name?: string }>(
                    event.advisor_individuals
                  )
                    .map((p) => String(p?.name ?? "").trim())
                    .filter(Boolean);
                  return inds.length > 0 ? inds.join(", ") : "Not available";
                })()}
              </td>
              <td className="px-4 py-2 border border-gray-300">
                {(() => {
                  const text = getOtherAdvisorsText(event.other_advisors);
                  if (!text || text === "None") return text;
                  return text.split(/\s*,\s*/).map((name, i, arr) => (
                    <span
                      key={`${name}-${i}`}
                      className="inline-block whitespace-nowrap"
                    >
                      {name}
                      {i < arr.length - 1 ? ", " : ""}
                    </span>
                  ));
                })()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
