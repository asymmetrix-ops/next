"use client";

import { useGlobalSearch } from "./GlobalSearchProvider";

const isMac =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * The always-visible entry point for the global search modal. Two visual
 * variants: "sidebar" (compact pill under the logo, on every page) and
 * "hero" (the larger pill used on the dashboard). Both just open the one
 * shared modal — neither owns any search state itself.
 */
export function GlobalSearchTrigger({
  variant = "sidebar",
  className = "",
}: {
  variant?: "sidebar" | "hero";
  className?: string;
}) {
  const { openSearch } = useGlobalSearch();

  if (variant === "hero") {
    return (
      <button
        type="button"
        onClick={openSearch}
        className={`relative flex w-full min-w-0 max-w-3xl items-center gap-3 rounded-full border-2 border-blue-200 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:border-blue-300 ${className}`}
      >
        <svg
          width={17}
          height={17}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden="true"
          className="shrink-0 text-gray-400"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <span className="truncate text-base text-gray-500">
          Search companies, sectors, investors, advisors, individuals, insights, events…
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openSearch}
      className={`flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-left text-sm text-gray-500 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 ${className}`}
    >
      <svg
        width={15}
        height={15}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        aria-hidden="true"
        className="shrink-0"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <span className="min-w-0 flex-1 truncate">Search</span>
      <kbd className="shrink-0 rounded border border-gray-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
        {isMac ? "⌘K" : "Ctrl K"}
      </kbd>
    </button>
  );
}
