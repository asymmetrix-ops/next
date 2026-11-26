"use client";

import { useTheme } from "@/components/providers/ThemeProvider";
import { THEME_OPTIONS } from "@/lib/theme";

export function ThemeSettings() {
  const { preference, setPreference } = useTheme();

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-[15px] font-bold text-gray-900">Theme</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Light or dark colours across the whole platform.
        </p>
      </div>
      <div className="p-4">
        <div
          className="inline-flex gap-0.5 bg-gray-100 border border-gray-200 rounded-full p-[3px]"
          role="radiogroup"
          aria-label="Theme"
        >
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={preference === option.value}
              onClick={() => setPreference(option.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                preference === option.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="mt-2.5 text-xs text-gray-500">
          Match my computer follows your computer&apos;s own light or dark
          setting. PDF exports and emails always stay light.
        </p>
      </div>
    </div>
  );
}
