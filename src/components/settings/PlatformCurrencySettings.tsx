"use client";

import { CURRENCY_OPTIONS } from "@/lib/fxRates";
import type { Currency } from "@/lib/fxRates";
import { usePlatformCurrency } from "@/components/providers/PlatformCurrencyProvider";

export function PlatformCurrencySettings() {
  const { currency, setCurrency } = usePlatformCurrency();

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        Platform Currency
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Choose the currency used to display monetary values across company
        lists, investor portfolios, sector overviews, and other views.
      </p>

      <label className="block max-w-xs">
        <span className="block text-sm font-medium text-gray-700 mb-1">
          Currency
        </span>
        <select
          value={currency}
          onChange={(event) => setCurrency(event.target.value as Currency)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
        >
          {CURRENCY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
