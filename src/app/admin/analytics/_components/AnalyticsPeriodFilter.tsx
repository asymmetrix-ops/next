"use client";

import { useMemo } from "react";
import {
  applyYearConstraints,
  clampPeriodMonth,
  clampPeriodMonths,
  getYearOptions,
  isMonthSelectable,
  MONTH_LABELS,
  type PeriodFilterState,
  type PeriodType,
  togglePeriodMonth,
} from "./periodFilterUtils";

type AnalyticsPeriodFilterProps = {
  value: PeriodFilterState;
  onChange: (patch: Partial<PeriodFilterState>) => void;
  className?: string;
};

export function AnalyticsPeriodFilter({
  value,
  onChange,
  className = "",
}: AnalyticsPeriodFilterProps) {
  const yearOptions = useMemo(() => getYearOptions(), []);

  return (
    <div className={className}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Time period</span>
          <select
            value={value.periodType}
            onChange={(e) => {
              const periodType = e.target.value as PeriodType;
              const patch: Partial<PeriodFilterState> = { periodType };
              if (periodType === "multiple_months") {
                patch.periodMonths = clampPeriodMonths(
                  value.periodMonths,
                  value.periodYear
                );
              }
              if (periodType === "specific_month") {
                patch.periodMonth = clampPeriodMonth(
                  value.periodMonth,
                  value.periodYear
                );
              }
              onChange(patch);
            }}
            className="rounded border px-3 py-2 text-sm"
          >
            <option value="this_month">This month</option>
            <option value="specific_month">Specific month</option>
            <option value="multiple_months">Multiple months</option>
            <option value="ytd">Year to date</option>
            <option value="last_year">Last year</option>
          </select>
        </label>

        {(value.periodType === "specific_month" ||
          value.periodType === "multiple_months" ||
          value.periodType === "last_year") && (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Year</span>
            <select
              value={value.periodYear}
              onChange={(e) =>
                onChange(applyYearConstraints(value, Number(e.target.value)))
              }
              className="rounded border px-3 py-2 text-sm"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
        )}

        {value.periodType === "specific_month" && (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Month</span>
            <select
              value={value.periodMonth}
              onChange={(e) =>
                onChange({ periodMonth: Number(e.target.value) })
              }
              className="rounded border px-3 py-2 text-sm"
            >
              {MONTH_LABELS.map((label, idx) => {
                const month = idx + 1;
                const selectable = isMonthSelectable(value.periodYear, month);
                return (
                  <option key={label} value={month} disabled={!selectable}>
                    {label}
                  </option>
                );
              })}
            </select>
          </label>
        )}
      </div>

      {value.periodType === "multiple_months" && (
        <div className="mt-4">
          <span className="mb-2 block text-sm font-medium text-gray-700">
            Months ({value.periodYear})
          </span>
          <div className="flex flex-wrap gap-2">
            {MONTH_LABELS.map((label, idx) => {
              const month = idx + 1;
              const selected = value.periodMonths.includes(month);
              const selectable = isMonthSelectable(value.periodYear, month);
              return (
                <button
                  key={label}
                  type="button"
                  disabled={!selectable}
                  onClick={() => {
                    if (!selectable) return;
                    onChange({
                      periodMonths: togglePeriodMonth(value.periodMonths, month),
                    });
                  }}
                  className={`rounded border px-3 py-1.5 text-sm ${
                    !selectable
                      ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                      : selected
                        ? "border-black bg-black text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
