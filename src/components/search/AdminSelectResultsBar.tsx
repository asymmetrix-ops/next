"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/components/providers/AuthProvider";
import { isAdminUser } from "@/lib/userStatus";

const BUTTON =
  "px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-50";

/**
 * Admin only: select every result of the current filters (all pages), or the
 * first N of them. The ids then behave like ticked rows (export, follow, lists).
 */
export function AdminSelectResultsBar({
  resultCount,
  collectIds,
  onSelect,
}: {
  /** Number of results the current filters return (all pages). */
  resultCount: number;
  /** Resolve the ids of the current filters; stops early when maxIds is given. */
  collectIds: (maxIds?: number) => Promise<number[]>;
  onSelect: (ids: number[]) => void;
}) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [customCount, setCustomCount] = useState("");

  if (!isAdminUser(user) || resultCount <= 0) return null;

  const customNumber = Number.parseInt(customCount, 10);
  const customValid =
    /^\d+$/.test(customCount.trim()) &&
    customNumber >= 1 &&
    customNumber <= resultCount;

  const run = async (count?: number) => {
    if (busy) return;
    setBusy(true);
    try {
      const ids = await collectIds(count);
      onSelect(ids);
      toast.success(
        `Selected ${ids.length.toLocaleString()} ${ids.length === 1 ? "result" : "results"}.`
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not select the results."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2">
      <button
        type="button"
        className={BUTTON}
        disabled={busy}
        onClick={() => void run()}
      >
        {busy
          ? "Selecting…"
          : `Select all ${resultCount.toLocaleString()} ${resultCount === 1 ? "result" : "results"}`}
      </button>
      {resultCount > 1 && (
        <span className="inline-flex items-center gap-1">
          <input
            type="number"
            min={1}
            max={resultCount}
            inputMode="numeric"
            value={customCount}
            disabled={busy}
            onChange={(e) => setCustomCount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && customValid) void run(customNumber);
            }}
            placeholder="Custom number"
            aria-label="Number of results to select"
            className="w-36 px-3 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
          />
          <button
            type="button"
            className={BUTTON}
            disabled={busy || !customValid}
            onClick={() => void run(customNumber)}
          >
            Select first {customValid ? customNumber.toLocaleString() : "…"}
          </button>
        </span>
      )}
    </div>
  );
}
