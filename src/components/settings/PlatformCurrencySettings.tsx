"use client";

import { CURRENCY_OPTIONS } from "@/lib/fxRates";
import { usePlatformCurrency } from "@/components/providers/PlatformCurrencyProvider";

export function PlatformCurrencySettings() {
  const { currency, setCurrency } = usePlatformCurrency();

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-[15px] font-bold text-gray-900">
          Platform currency
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Used for every monetary value: company lists, investor portfolios,
          sector overviews.
        </p>
      </div>
      <div className="p-4">
        <div className="inline-flex gap-0.5 bg-gray-100 border border-gray-200 rounded-full p-[3px]">
          {CURRENCY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setCurrency(option.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                currency === option.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {option.symbol} {option.value}
            </button>
          ))}
        </div>
        <p className="mt-2.5 text-xs text-gray-500">
          Converted at the latest close rate. Source values stay in their
          reporting currency.
        </p>
      </div>
    </div>
  );
}
