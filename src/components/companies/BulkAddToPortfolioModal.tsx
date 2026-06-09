"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  bulkAddCompaniesToPortfolio,
  type BulkPortfolioAction,
  type BulkProgress,
} from "@/lib/bulkPortfolioAdd";
import { fetchUserListsFromXano } from "@/lib/userLists";
import { usePortfolioStore } from "@/store/portfolioStore";

type ListOption = { id: number; label: string };

type ActionMode = "follow" | "existing_lists" | "new_list";

type BulkAddToPortfolioModalProps = {
  isOpen: boolean;
  onClose: () => void;
  companyIds: number[];
  onComplete?: () => void;
};

export function BulkAddToPortfolioModal({
  isOpen,
  onClose,
  companyIds,
  onComplete,
}: BulkAddToPortfolioModalProps) {
  const fetchPortfolio = usePortfolioStore((s) => s.fetchPortfolio);

  const [mode, setMode] = useState<ActionMode>("follow");
  const [lists, setLists] = useState<ListOption[]>([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [selectedListIds, setSelectedListIds] = useState<number[]>([]);
  const [newListName, setNewListName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<BulkProgress | null>(null);

  const count = companyIds.length;

  useEffect(() => {
    if (!isOpen) return;
    setMode("follow");
    setSelectedListIds([]);
    setNewListName("");
    setProgress(null);
    setSubmitting(false);

    setListsLoading(true);
    fetchUserListsFromXano()
      .then((raw) => {
        const arr = Array.isArray(raw) ? raw : [];
        setLists(
          (arr as Record<string, unknown>[])
            .map((item) => {
              const id = Number(item.id);
              const label =
                (typeof item.portfolio_label === "string" &&
                  item.portfolio_label.trim()) ||
                (typeof item.list_name === "string" && item.list_name.trim()) ||
                `List ${id}`;
              return { id, label };
            })
            .filter((item) => Number.isFinite(item.id) && item.id > 0)
        );
      })
      .catch(() => setLists([]))
      .finally(() => setListsLoading(false));
  }, [isOpen]);

  const selectedListLabels = useMemo(
    () =>
      lists
        .filter((list) => selectedListIds.includes(list.id))
        .map((list) => list.label),
    [lists, selectedListIds]
  );

  const toggleList = useCallback((listId: number) => {
    setSelectedListIds((prev) =>
      prev.includes(listId) ? prev.filter((id) => id !== listId) : [...prev, listId]
    );
  }, []);

  const canSubmit =
    !submitting &&
    count > 0 &&
    (mode === "follow" ||
      (mode === "existing_lists" && selectedListIds.length > 0) ||
      (mode === "new_list" && newListName.trim().length > 0));

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("asymmetrix_auth_token")
        : null;
    if (!token) {
      toast.error("Please sign in to add companies to your portfolio.");
      return;
    }

    let action: BulkPortfolioAction;
    if (mode === "follow") {
      action = { mode: "follow" };
    } else if (mode === "existing_lists") {
      action = { mode: "lists", listIds: selectedListIds };
    } else {
      action = { mode: "new_list", name: newListName.trim() };
    }

    setSubmitting(true);
    setProgress({ total: 0, done: 0, success: 0, failed: 0 });

    try {
      const result = await bulkAddCompaniesToPortfolio(
        companyIds,
        action,
        setProgress
      );

      await fetchPortfolio();

      const companyLabel = `${count} ${count === 1 ? "company" : "companies"}`;
      let destination = "My Portfolio";

      if (mode === "existing_lists") {
        destination = selectedListLabels.join(", ");
      } else if (mode === "new_list") {
        destination = `"${newListName.trim()}"`;
      } else if (mode === "follow") {
        destination = "My Portfolio";
      }

      if (result.failed === 0) {
        toast.success(`Added ${companyLabel} to ${destination}.`);
      } else if (result.success > 0) {
        toast.success(
          `Added ${result.success} of ${count} companies to ${destination}. ${result.failed} failed.`
        );
      } else {
        toast.error("Failed to add companies. Please try again.");
        return;
      }

      onComplete?.();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add companies.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Add to portfolio
        </h2>
        <p className="text-sm text-gray-600 mb-5">
          {count.toLocaleString()} {count === 1 ? "company" : "companies"}{" "}
          selected
        </p>

        <div className="space-y-3 mb-6">
          <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="bulk_action"
              checked={mode === "follow"}
              onChange={() => setMode("follow")}
              disabled={submitting}
              className="mt-0.5"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">Follow only</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Add to My Portfolio. No list assignment.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="bulk_action"
              checked={mode === "existing_lists"}
              onChange={() => setMode("existing_lists")}
              disabled={submitting}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                Add to existing list(s)
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Choose one or more lists.
              </p>
              {mode === "existing_lists" && (
                <div className="mt-3 border border-gray-100 rounded-lg p-2 bg-gray-50 max-h-40 overflow-y-auto">
                  {listsLoading ? (
                    <p className="text-xs text-gray-500 px-1 py-2">Loading lists…</p>
                  ) : lists.length === 0 ? (
                    <p className="text-xs text-gray-500 px-1 py-2">
                      No lists yet. Create one below or from My Portfolio.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {lists.map((list) => (
                        <li key={list.id}>
                          <label className="flex items-center gap-2 cursor-pointer text-sm px-1 py-1">
                            <input
                              type="checkbox"
                              checked={selectedListIds.includes(list.id)}
                              onChange={() => toggleList(list.id)}
                              disabled={submitting}
                              className="rounded"
                            />
                            <span className="truncate text-gray-800">{list.label}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="bulk_action"
              checked={mode === "new_list"}
              onChange={() => setMode("new_list")}
              disabled={submitting}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">Create new list</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Create a list and add all selected companies to it.
              </p>
              {mode === "new_list" && (
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="List name…"
                  disabled={submitting}
                  className="mt-3 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canSubmit) void handleSubmit();
                  }}
                />
              )}
            </div>
          </label>
        </div>

        {submitting && progress && progress.total > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Processing…</span>
              <span>
                {progress.done}/{progress.total}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-200"
                style={{
                  width: `${Math.round((progress.done / progress.total) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Adding…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
