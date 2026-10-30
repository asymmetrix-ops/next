"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { BulkAddToPortfolioModal } from "@/components/companies/BulkAddToPortfolioModal";
import type { PortfolioEntityType } from "@/lib/portfolioEntity";
import {
  createSavedFilter,
  deleteSavedFilter,
  listSavedFilters,
  renameSavedFilter,
  updateSavedFilter,
  type SavedFilter,
} from "@/lib/savedFilters";
import {
  stripNonFilterKeys,
  suggestSavedFilterName,
} from "@/lib/savedFilterUtils";

type Props = {
  entityType: PortfolioEntityType;
  /** Plural label used in names and messages, e.g. "Companies". */
  entityPlural: string;
  /** Current list-view filters. */
  filters: Record<string, unknown> | undefined;
  /** True once the user has set at least one filter. */
  hasFilters: boolean;
  /** Number of results the current filters return (all pages). */
  resultCount: number;
  /** Resolve every id matching the current filters, not just the visible page. */
  collectIds: () => Promise<number[]>;
  /** Re-apply a saved filter set in the list view. */
  onApplySaved: (filters: Record<string, unknown>) => void;
};

type NameDialog = { mode: "save" } | { mode: "rename"; filter: SavedFilter };

const BUTTON =
  "px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-50";

export function ListViewPortfolioBar({
  entityType,
  entityPlural,
  filters,
  hasFilters,
  resultCount,
  collectIds,
  onApplySaved,
}: Props) {
  const [saved, setSaved] = useState<SavedFilter[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [nameDialog, setNameDialog] = useState<NameDialog | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    try {
      setSaved(await listSavedFilters(entityType));
    } catch {
      setSaved([]);
    }
  }, [entityType]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const openSave = () => {
    setName(suggestSavedFilterName(entityPlural, filters ?? {}));
    setNameDialog({ mode: "save" });
  };

  const submitName = async () => {
    if (!nameDialog || !name.trim() || busy) return;
    setBusy(true);
    try {
      if (nameDialog.mode === "save") {
        await createSavedFilter({
          entityType,
          name,
          filters: stripNonFilterKeys(filters ?? {}),
        });
        toast.success(`Saved filters "${name.trim()}"`);
      } else {
        await renameSavedFilter(nameDialog.filter.id, name);
      }
      setNameDialog(null);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save filters.");
    } finally {
      setBusy(false);
    }
  };

  const overwrite = async (item: SavedFilter) => {
    try {
      await updateSavedFilter(item.id, stripNonFilterKeys(filters ?? {}));
      toast.success(`Updated "${item.name}" with the current filters`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update filters.");
    }
  };

  const remove = async (item: SavedFilter) => {
    if (!window.confirm(`Delete saved filters "${item.name}"?`)) return;
    try {
      await deleteSavedFilter(item.id);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete filters.");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2">
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          className={BUTTON}
          onClick={() => setMenuOpen((open) => !open)}
        >
          Saved filters{saved.length > 0 ? ` (${saved.length})` : ""} ▾
        </button>
        {menuOpen && (
          <div className="absolute left-0 z-50 mt-1 w-80 max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
            {saved.length === 0 ? (
              <p className="p-3 text-sm text-gray-500">No saved filters yet.</p>
            ) : (
              <ul>
                {saved.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-1 px-2 py-1.5 hover:bg-gray-50"
                  >
                    <button
                      type="button"
                      className="flex-1 min-w-0 truncate text-left text-sm text-gray-900"
                      onClick={() => {
                        setMenuOpen(false);
                        onApplySaved(
                          (item.filters ?? {}) as Record<string, unknown>
                        );
                      }}
                    >
                      {item.name}
                    </button>
                    <button
                      type="button"
                      title="Rename"
                      className="text-xs text-gray-500 hover:text-gray-900 px-1"
                      onClick={() => {
                        setMenuOpen(false);
                        setName(item.name);
                        setNameDialog({ mode: "rename", filter: item });
                      }}
                    >
                      Rename
                    </button>
                    {hasFilters && (
                      <button
                        type="button"
                        title="Save the current filters over this set"
                        className="text-xs text-gray-500 hover:text-gray-900 px-1"
                        onClick={() => void overwrite(item)}
                      >
                        Update
                      </button>
                    )}
                    <button
                      type="button"
                      title="Delete"
                      className="text-xs text-red-600 hover:text-red-800 px-1"
                      onClick={() => void remove(item)}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {hasFilters && (
        <>
          <button type="button" className={BUTTON} onClick={openSave}>
            Save filters
          </button>
          <button
            type="button"
            className={BUTTON}
            disabled={resultCount <= 0}
            onClick={() => setAddOpen(true)}
          >
            Add {resultCount.toLocaleString()}{" "}
            {resultCount === 1 ? "result" : "results"} to My Portfolio
          </button>
        </>
      )}

      {nameDialog && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/40"
          onClick={() => !busy && setNameDialog(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              {nameDialog.mode === "save" ? "Save filters" : "Rename saved filters"}
            </h2>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void submitName()}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
            />
            <div className="flex justify-end gap-3 mt-5">
              <button
                type="button"
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                onClick={() => setNameDialog(null)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50"
                onClick={() => void submitName()}
                disabled={busy || !name.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <BulkAddToPortfolioModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        entityType={entityType}
        resolveEntityIds={collectIds}
        resultCount={resultCount}
      />
    </div>
  );
}
