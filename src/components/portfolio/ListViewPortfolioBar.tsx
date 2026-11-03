"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-hot-toast";
import { AnchoredPopover } from "@/components/filters/AnchoredPopover";
import { useFilterBarSlot } from "@/components/portfolio/filterBarSlot";
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
  const [query, setQuery] = useState("");
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const slot = useFilterBarSlot();

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

  const visible = useMemo(() => {
    const q = query.toLowerCase().trim();
    return q ? saved.filter((f) => f.name.toLowerCase().includes(q)) : saved;
  }, [saved, query]);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setQuery("");
  }, []);

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

  const menu = (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => (menuOpen ? closeMenu() : setMenuOpen(true))}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 14px 5px 11px",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--fs-13)",
          fontWeight: 600,
          color: menuOpen ? "var(--ax-cyan-700)" : "var(--fg-2)",
          background: menuOpen ? "var(--ax-cyan-50)" : "white",
          border: `1px dashed ${menuOpen ? "var(--ax-cyan-300)" : "var(--ax-gray-300, #94a3b8)"}`,
          borderRadius: 999,
          cursor: "pointer",
          transition: "all 120ms",
          height: 34,
          whiteSpace: "nowrap",
        }}
      >
        <svg width="11" height="13" viewBox="0 0 11 13" fill="none">
          <path
            d="M1.5 1.5h8v10l-4-2.6-4 2.6v-10z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
        Saved filters{saved.length > 0 ? ` (${saved.length})` : ""}
      </button>
      {menuOpen && (
        <AnchoredPopover
          anchorRef={anchorRef}
          onDismiss={closeMenu}
          bare
          width={380}
        >
          <div
            style={{
              width: 380,
              maxHeight: 460,
              display: "flex",
              flexDirection: "column",
              background: "white",
              border: "1px solid var(--border-1)",
              borderRadius: "var(--r-lg)",
              boxShadow:
                "0 16px 40px rgba(17,22,29,0.16), 0 2px 6px rgba(17,22,29,0.06)",
              overflow: "hidden",
              fontFamily: "var(--font-sans)",
            }}
          >
            <div
              style={{
                padding: "12px 14px 10px",
                borderBottom: "1px solid var(--ax-gray-100)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: saved.length > 0 ? 8 : 0,
                  gap: 8,
                }}
              >
                <div
                  style={{
                    fontSize: "var(--fs-14)",
                    fontWeight: 700,
                    color: "var(--fg-1)",
                  }}
                >
                  Saved filters
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{ fontSize: 11, color: "var(--fg-4)" }}
                    className="ax-numeric"
                  >
                    {saved.length} saved
                  </div>
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={closeMenu}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 24,
                      height: 24,
                      padding: 0,
                      border: "none",
                      borderRadius: "var(--r-sm)",
                      background: "transparent",
                      color: "var(--fg-4)",
                      cursor: "pointer",
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M3 3l6 6M9 3l-6 6"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              {saved.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 10px",
                    background: "var(--ax-gray-25)",
                    border: "1px solid var(--border-1)",
                    borderRadius: "var(--r-md)",
                  }}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 16 16"
                    fill="none"
                    style={{ color: "var(--fg-4)", flexShrink: 0 }}
                  >
                    <circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.4" />
                    <path
                      d="M10.5 10.5L13.5 13.5"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  </svg>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search saved filters…"
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      fontFamily: "inherit",
                      fontSize: "var(--fs-13)",
                      color: "var(--fg-1)",
                    }}
                  />
                </div>
              )}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "6px 6px 8px" }}>
              {visible.length === 0 ? (
                <div
                  style={{
                    padding: 28,
                    textAlign: "center",
                    color: "var(--fg-4)",
                    fontSize: "var(--fs-13)",
                  }}
                >
                  {saved.length === 0
                    ? "No saved filters yet."
                    : "No saved filters match."}
                </div>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {visible.map((item) => (
                    <SavedFilterRow
                      key={item.id}
                      item={item}
                      canUpdate={hasFilters}
                      onApply={() => {
                        closeMenu();
                        onApplySaved(
                          (item.filters ?? {}) as Record<string, unknown>
                        );
                      }}
                      onRename={() => {
                        closeMenu();
                        setName(item.name);
                        setNameDialog({ mode: "rename", filter: item });
                      }}
                      onUpdate={() => void overwrite(item)}
                      onDelete={() => void remove(item)}
                    />
                  ))}
                </ul>
              )}
            </div>

            <div
              style={{
                padding: "8px 14px",
                borderTop: "1px solid var(--ax-gray-100)",
                background: "var(--ax-gray-25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                fontSize: 11,
                color: "var(--fg-3)",
              }}
            >
              <span>
                {hasFilters
                  ? "Save what's applied right now"
                  : "Add filters to save them"}
              </span>
              <button
                type="button"
                disabled={!hasFilters}
                onClick={() => {
                  closeMenu();
                  openSave();
                }}
                style={{
                  padding: "4px 12px",
                  fontFamily: "inherit",
                  fontSize: "var(--fs-13)",
                  fontWeight: 600,
                  color: hasFilters ? "var(--fg-link)" : "var(--fg-4)",
                  background: "white",
                  border: "1px solid var(--border-1)",
                  borderRadius: 999,
                  cursor: hasFilters ? "pointer" : "not-allowed",
                }}
              >
                Save current filters
              </button>
            </div>
          </div>
        </AnchoredPopover>
      )}
    </>
  );

  return (
    <>
      {slot ? createPortal(menu, slot) : null}
      {(!slot || hasFilters) && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2">
          {!slot && menu}
          {hasFilters && (
            <button
              type="button"
              className={BUTTON}
              disabled={resultCount <= 0}
              onClick={() => setAddOpen(true)}
            >
              Add {resultCount.toLocaleString()}{" "}
              {resultCount === 1 ? "result" : "results"} to My Portfolio
            </button>
          )}
        </div>
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
        onSaveFiltersForSync={
          entityType === "company"
            ? async (listName) => {
                const created = await createSavedFilter({
                  entityType,
                  name: listName,
                  filters: stripNonFilterKeys(filters ?? {}),
                });
                void refresh();
                return created.id ?? null;
              }
            : undefined
        }
      />
    </>
  );
}

function SavedFilterRow({
  item,
  canUpdate,
  onApply,
  onRename,
  onUpdate,
  onDelete,
}: {
  item: SavedFilter;
  canUpdate: boolean;
  onApply: () => void;
  onRename: () => void;
  onUpdate: () => void;
  onDelete: () => void;
}) {
  const [hover, setHover] = useState(false);
  const action = (color: string): React.CSSProperties => ({
    background: "none",
    border: "none",
    padding: "2px 4px",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 11.5,
    fontWeight: 600,
    color,
  });
  return (
    <li
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 8px",
        borderRadius: 6,
        background: hover ? "var(--ax-gray-25)" : "transparent",
      }}
    >
      <button
        type="button"
        onClick={onApply}
        title={item.name}
        style={{
          flex: 1,
          minWidth: 0,
          padding: "6px 0",
          textAlign: "left",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: "var(--fs-13)",
          fontWeight: 500,
          color: "var(--fg-1)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {item.name}
      </button>
      <span
        style={{
          display: "inline-flex",
          gap: 2,
          opacity: hover ? 1 : 0,
          transition: "opacity 120ms",
        }}
      >
        <button type="button" onClick={onRename} style={action("var(--fg-3)")}>
          Rename
        </button>
        {canUpdate && (
          <button
            type="button"
            title="Save the current filters over this set"
            onClick={onUpdate}
            style={action("var(--fg-3)")}
          >
            Update
          </button>
        )}
        <button type="button" onClick={onDelete} style={action("#dc2626")}>
          Delete
        </button>
      </span>
    </li>
  );
}
