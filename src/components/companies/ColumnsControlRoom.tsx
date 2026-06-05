"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  COMPANIES_COLUMN_CATEGORIES,
  ALL_COMPANIES_COLUMN_META,
  PROD_DEFAULT_COMPANY_COLUMN_KEYS,
  columnKeysToVisibility,
  type CompanyColumnCategory,
  type CompanyColumnMeta,
} from "./companiesColumnCategories";
import { FILTER_PINNED_TOOLTIP } from "./companiesColumnFilterMap";

const AX = {
  gray25: "#F9FAFB",
  gray50: "#F3F4F6",
  gray100: "#E5E7EB",
  gray200: "#D1D5DB",
  gray300: "#9CA3AF",
  gray400: "#6B7280",
  gray600: "#4B5563",
  gray900: "#111827",
  cyan50: "#ECFEFF",
  cyan100: "#CFFAFE",
  cyan400: "#22D3EE",
  cyan700: "#0370AA",
  positive: "#15803D",
  positiveBg: "#ECFDF5",
  fg1: "#111827",
  fg2: "#374151",
  fg3: "#6B7280",
  fg4: "#9CA3AF",
  fgLink: "#0370AA",
  bg1: "#FFFFFF",
  bg2: "#F9FAFB",
  border1: "#E5E7EB",
  border2: "#D1D5DB",
  fontSans:
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
};

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <rect x="2.25" y="5.25" width="7.5" height="5.5" rx="1.1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 5.25V3.75a2 2 0 014 0v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function DragHandleIcon() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" aria-hidden="true">
      <circle cx="2" cy="2" r="1.2" />
      <circle cx="8" cy="2" r="1.2" />
      <circle cx="2" cy="7" r="1.2" />
      <circle cx="8" cy="7" r="1.2" />
      <circle cx="2" cy="12" r="1.2" />
      <circle cx="8" cy="12" r="1.2" />
    </svg>
  );
}

function reorderStringKeys(keys: string[], dragKey: string, dropKey: string): string[] {
  if (dragKey === dropKey) return keys;
  const fromIndex = keys.indexOf(dragKey);
  const toIndex = keys.indexOf(dropKey);
  if (fromIndex < 0 || toIndex < 0) return keys;
  const next = [...keys];
  const [item] = next.splice(fromIndex, 1);
  const insertAt = fromIndex < toIndex ? toIndex - 1 : toIndex;
  next.splice(insertAt, 0, item);
  return next;
}

function Toggle({
  on,
  disabled,
  onChange,
  ariaLabel,
}: {
  on: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
}) {
  const bg = disabled
    ? on ? AX.cyan400 : AX.gray200
    : on ? AX.cyan700 : AX.gray300;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!on)}
      style={{
        width: 34, height: 20, borderRadius: 999,
        background: bg, border: "none", padding: 0,
        position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 150ms ease-out",
        flexShrink: 0,
        opacity: disabled ? 0.85 : 1,
      }}
    >
      <span style={{
        position: "absolute", top: 2, left: on ? 16 : 2,
        width: 16, height: 16, borderRadius: "50%",
        background: "white",
        boxShadow: "0 1px 2px rgba(17,22,29,0.18)",
        transition: "left 150ms ease-out",
      }} />
    </button>
  );
}

function ColumnRow({
  column,
  visible,
  locked,
  lockTooltip,
  onToggle,
}: {
  column: CompanyColumnMeta;
  visible: boolean;
  locked?: boolean;
  lockTooltip?: string;
  onToggle: (on: boolean) => void;
}) {
  const isLocked = locked ?? column.locked;
  const [hover, setHover] = useState(false);
  return (
    <li
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "7px 6px 7px 10px", borderRadius: 6,
        background: hover ? AX.gray25 : "transparent",
        transition: "background 120ms ease-out",
      }}
    >
      <span style={{
        fontSize: 13, fontWeight: 500,
        color: visible ? AX.fg1 : AX.fg2,
        flex: "0 0 auto",
        display: "inline-flex", alignItems: "center", gap: 5,
      }}>
        {column.label}
        {isLocked && (
          <span style={{ color: AX.fg4, display: "inline-flex" }}
            aria-label={lockTooltip ?? "Locked column"}
            title={lockTooltip ?? "Locked column"}>
            <LockIcon />
          </span>
        )}
      </span>
      {column.badge && (
        <span style={{
          display: "inline-flex", alignItems: "center",
          padding: "2px 6px", fontSize: 10, fontWeight: 700,
          letterSpacing: "0.04em", textTransform: "uppercase",
          color: AX.cyan700, background: AX.cyan50,
          border: `1px solid ${AX.cyan100}`, borderRadius: 4,
        }}>
          {column.badge}
        </span>
      )}
      <span style={{ flex: 1 }} />
      <Toggle
        on={visible}
        disabled={isLocked}
        onChange={onToggle}
        ariaLabel={`Show ${column.label}`}
      />
    </li>
  );
}

function ReorderRow({
  column, position, isSelected, isDragging, isDragOver,
  onSelect, onDragStart, onDragOver, onDrop, onDragEnd,
}: {
  column: CompanyColumnMeta;
  position: number;
  isSelected: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onSelect: () => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <li
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", column.columnKey); onDragStart(); }}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; onDragOver(); }}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDrop(); }}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onSelect}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "7px 6px 7px 8px", borderRadius: 7,
        background: isDragging ? "#F8FAFC" : isDragOver ? "#EFF6FF" : isSelected ? "#EFF6FF" : hover ? AX.gray25 : "transparent",
        border: isDragOver ? "1.5px solid #93C5FD" : isSelected ? "1.5px solid #BFDBFE" : "1.5px solid transparent",
        cursor: "grab", opacity: isDragging ? 0.55 : 1,
        transition: "background 100ms ease-out, border-color 100ms ease-out",
        userSelect: "none",
      }}
    >
      <span style={{ color: AX.fg4, display: "inline-flex", flexShrink: 0, cursor: "grab" }} aria-hidden="true">
        <DragHandleIcon />
      </span>
      <span style={{
        fontSize: 11, fontWeight: 600, color: isSelected ? "#1D4ED8" : AX.fg4,
        fontVariantNumeric: "tabular-nums", minWidth: 18, textAlign: "right", flexShrink: 0,
      }}>
        {position}
      </span>
      <span style={{
        fontSize: 13, fontWeight: 500, color: isSelected ? "#1E40AF" : AX.fg1,
        flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {column.label}
      </span>
      {column.badge && (
        <span style={{
          display: "inline-flex", alignItems: "center", padding: "2px 5px",
          fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
          color: AX.cyan700, background: AX.cyan50, border: `1px solid ${AX.cyan100}`,
          borderRadius: 4, flexShrink: 0,
        }}>
          {column.badge}
        </span>
      )}
    </li>
  );
}

function FrozenColumnRow({
  column, position, lockTooltip = "Locked column",
}: {
  column: CompanyColumnMeta;
  position: number;
  lockTooltip?: string;
}) {
  return (
    <li style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "7px 6px 7px 8px", borderRadius: 7,
      background: "#FFFBEB", border: "1.5px solid #F3E8C8",
      marginBottom: 3, userSelect: "none",
    }}>
      <span style={{ color: AX.fg4, display: "inline-flex", flexShrink: 0 }} aria-hidden="true">
        <DragHandleIcon />
      </span>
      <span style={{
        fontSize: 11, fontWeight: 600, color: "#D97706",
        fontVariantNumeric: "tabular-nums", minWidth: 18, textAlign: "right", flexShrink: 0,
      }}>
        {position}
      </span>
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        fontSize: 13, fontWeight: 500, color: AX.fg1, flex: 1,
      }}>
        {column.label}
        <span style={{ color: AX.fg3, display: "inline-flex" }} aria-label={lockTooltip} title={lockTooltip}>
          <LockIcon />
        </span>
      </span>
    </li>
  );
}

export interface ColumnsControlRoomProps {
  initial: Record<string, boolean>;
  initialOrder?: string[];
  filterPinnedColumnKeys?: string[];
  onCancel: () => void;
  onApply: (visible: Record<string, boolean>, order?: string[]) => void;
  categories?: CompanyColumnCategory[];
  title?: string;
  subtitle?: string;
}

export function ColumnsControlRoom({
  initial,
  initialOrder,
  filterPinnedColumnKeys = [],
  onCancel,
  onApply,
  categories = COMPANIES_COLUMN_CATEGORIES,
  title = "Columns",
}: ColumnsControlRoomProps) {
  const buildState = (mode?: "default") => {
    const out: Record<string, boolean> = {};
    for (const cat of categories) {
      for (const column of cat.columns) {
        out[column.id] = mode === "default" ? column.defaultVisible : (initial?.[column.id] ?? column.defaultVisible);
      }
    }
    return out;
  };

  const [visible, setVisible] = useState(() => buildState());
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "visible_order">("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const allMeta = useMemo(() => categories.flatMap((cat) => cat.columns), [categories]);
  const filterPinnedSet = useMemo(() => new Set(filterPinnedColumnKeys), [filterPinnedColumnKeys]);

  const isColumnLocked = useCallback(
    (column: CompanyColumnMeta) => Boolean(column.locked) || filterPinnedSet.has(column.columnKey),
    [filterPinnedSet]
  );
  const lockedMeta = useMemo(() => allMeta.filter((c) => c.locked), [allMeta]);
  const lockedColumnKeys = useMemo(() => new Set(lockedMeta.map((c) => c.columnKey)), [lockedMeta]);
  const filterPinnedMeta = useMemo(
    () => allMeta.filter((c) => !c.locked && filterPinnedSet.has(c.columnKey) && visible[c.id]),
    [allMeta, filterPinnedSet, visible]
  );

  const [orderedKeys, setOrderedKeys] = useState<string[]>(() => {
    const visibleIds = new Set(Object.entries(initial).filter(([, v]) => v).map(([k]) => k));
    const visibleColumnKeys = allMeta
      .filter((c) => !c.locked && !filterPinnedSet.has(c.columnKey) && visibleIds.has(c.id))
      .map((c) => c.columnKey);
    const visibleKeySet = new Set(visibleColumnKeys);
    if (initialOrder && initialOrder.length > 0) {
      const result = initialOrder.filter((k) => !lockedColumnKeys.has(k) && !filterPinnedSet.has(k) && visibleKeySet.has(k));
      visibleColumnKeys.forEach((k) => { if (!result.includes(k)) result.push(k); });
      return result;
    }
    return visibleColumnKeys;
  });

  useEffect(() => {
    if (filterPinnedColumnKeys.length === 0) return;
    setVisible((current) => {
      let changed = false;
      const next = { ...current };
      for (const column of allMeta) {
        if (filterPinnedSet.has(column.columnKey) && !next[column.id]) {
          next[column.id] = true;
          changed = true;
        }
      }
      return changed ? next : current;
    });
    setOrderedKeys((current) => current.filter((key) => !filterPinnedSet.has(key)));
  }, [filterPinnedColumnKeys, filterPinnedSet, allMeta]);

  const toggle = useCallback((id: string, on: boolean) => {
    const meta = allMeta.find((c) => c.id === id);
    if (!meta || isColumnLocked(meta)) return;
    setVisible((current) => ({ ...current, [id]: on }));
    setOrderedKeys((current) => {
      if (on) return current.includes(meta.columnKey) ? current : [...current, meta.columnKey];
      return current.filter((k) => k !== meta.columnKey);
    });
  }, [allMeta, isColumnLocked]);

  const allIds = useMemo(
    () => categories.flatMap((cat) => cat.columns.map((col) => col.id)),
    [categories]
  );
  const visCount = allIds.filter((id) => visible[id]).length;

  const reset = () => {
    const defaultVisible = columnKeysToVisibility([...PROD_DEFAULT_COMPANY_COLUMN_KEYS]);
    setVisible(defaultVisible);
    const defaultVisibleKeys = allMeta
      .filter((c) => !c.locked && defaultVisible[c.id])
      .map((c) => c.columnKey);
    setOrderedKeys(defaultVisibleKeys);
    setSelectedKey(null);
  };

  const orderedVisibleMeta = useMemo(() => {
    return orderedKeys
      .map((k) => allMeta.find((c) => c.columnKey === k && !c.locked && !filterPinnedSet.has(c.columnKey)))
      .filter((c): c is CompanyColumnMeta => Boolean(c));
  }, [orderedKeys, allMeta, filterPinnedSet]);

  const frozenColumnCount = lockedMeta.length + filterPinnedMeta.length;

  const moveUp = useCallback((columnKey: string) => {
    setOrderedKeys((current) => {
      const idx = current.indexOf(columnKey);
      if (idx <= 0) return current;
      const next = [...current];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }, []);

  const moveDown = useCallback((columnKey: string) => {
    setOrderedKeys((current) => {
      const idx = current.indexOf(columnKey);
      if (idx < 0 || idx >= current.length - 1) return current;
      const next = [...current];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }, []);

  useEffect(() => {
    if (tab !== "visible_order" || !selectedKey) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") { e.preventDefault(); moveUp(selectedKey); }
      else if (e.key === "ArrowDown") { e.preventDefault(); moveDown(selectedKey); }
      else if (e.key === "Escape") { setSelectedKey(null); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tab, selectedKey, moveUp, moveDown]);

  const handleDone = () => {
    const lockedVisibleKeys = lockedMeta.filter((c) => visible[c.id]).map((c) => c.columnKey);
    const filterPinnedVisibleKeys = filterPinnedMeta.map((c) => c.columnKey);
    const finalOrder = [...lockedVisibleKeys, ...filterPinnedVisibleKeys, ...orderedKeys];
    onApply(visible, finalOrder);
  };

  const handleReorderDrop = useCallback((targetKey: string) => {
    if (!dragKey || dragKey === targetKey) return;
    setOrderedKeys((current) => reorderStringKeys(current, dragKey, targetKey));
    setDragKey(null);
    setDragOverKey(null);
  }, [dragKey]);

  const showAllInSection = useCallback((category: CompanyColumnCategory) => {
    category.columns.forEach((col) => { if (!isColumnLocked(col)) toggle(col.id, true); });
  }, [isColumnLocked, toggle]);

  const hideAllInSection = useCallback((category: CompanyColumnCategory) => {
    category.columns.forEach((col) => { if (!isColumnLocked(col)) toggle(col.id, false); });
  }, [isColumnLocked, toggle]);

  const matchesQuery = (column: CompanyColumnMeta) =>
    !query || column.label.toLowerCase().includes(query.toLowerCase());

  return (
    <div
      style={panelStyles.panel}
      role="dialog"
      aria-label="Column settings"
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Header ── */}
      <div style={panelStyles.header}>
        <span style={panelStyles.title}>{title}</span>
        <button
          type="button"
          style={panelStyles.closeBtn}
          onClick={onCancel}
          aria-label="Close column settings"
        >
          <CloseIcon />
        </button>
      </div>

      {/* ── Search ── */}
      <div style={panelStyles.searchWrap}>
        <span style={panelStyles.searchIconWrap}>
          <SearchIcon />
        </span>
        <input
          type="text"
          placeholder="Search columns…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={panelStyles.searchInput}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            style={panelStyles.searchClear}
            aria-label="Clear search"
          >
            <CloseIcon />
          </button>
        )}
      </div>

      {/* ── Tabs ── */}
      <div style={panelStyles.tabsRow}>
        <button
          type="button"
          style={{ ...panelStyles.tab, ...(tab === "all" ? panelStyles.tabActive : {}) }}
          onClick={() => setTab("all")}
        >
          All columns
          <span style={{ ...panelStyles.tabBadge, ...(tab === "all" ? panelStyles.tabBadgeActive : {}) }}>
            {allIds.length}
          </span>
        </button>
        <button
          type="button"
          style={{ ...panelStyles.tab, ...(tab === "visible_order" ? panelStyles.tabActive : {}) }}
          onClick={() => { setTab("visible_order"); setQuery(""); }}
        >
          Visible &amp; order
          <span style={{ ...panelStyles.tabBadge, ...(tab === "visible_order" ? panelStyles.tabBadgeActive : {}) }}>
            {visCount}
          </span>
        </button>
      </div>

      {/* ── Content ── */}
      <div style={panelStyles.content}>
        {tab === "all" ? (
          <>
            {categories.map((category) => {
              const cols = category.columns.filter(matchesQuery);
              if (cols.length === 0) return null;

              const unlockable = category.columns.filter((c) => !isColumnLocked(c));
              const visibleUnlocked = unlockable.filter((c) => visible[c.id]).length;
              const allSectionOn = unlockable.length > 0 && visibleUnlocked === unlockable.length;
              const allSectionOff = visibleUnlocked === 0;

              return (
                <section key={category.id} style={panelStyles.section}>
                  <div style={panelStyles.sectionHeader}>
                    <span style={panelStyles.sectionName}>{category.name}</span>
                    {unlockable.length > 0 && (
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button
                          type="button"
                          style={{
                            ...panelStyles.sectionAction,
                            opacity: allSectionOn ? 0.4 : 1,
                            cursor: allSectionOn ? "default" : "pointer",
                          }}
                          onClick={() => !allSectionOn && showAllInSection(category)}
                          disabled={allSectionOn}
                        >
                          Show All
                        </button>
                        <button
                          type="button"
                          style={{
                            ...panelStyles.sectionAction,
                            opacity: allSectionOff ? 0.4 : 1,
                            cursor: allSectionOff ? "default" : "pointer",
                          }}
                          onClick={() => !allSectionOff && hideAllInSection(category)}
                          disabled={allSectionOff}
                        >
                          Hide All
                        </button>
                      </div>
                    )}
                  </div>
                  <ul style={panelStyles.rowList}>
                    {cols.map((column) => (
                      <ColumnRow
                        key={column.id}
                        column={column}
                        visible={!!visible[column.id]}
                        locked={isColumnLocked(column)}
                        lockTooltip={
                          filterPinnedSet.has(column.columnKey) ? FILTER_PINNED_TOOLTIP : undefined
                        }
                        onToggle={(on) => toggle(column.id, on)}
                      />
                    ))}
                  </ul>
                </section>
              );
            })}
            {categories.every((cat) => cat.columns.filter(matchesQuery).length === 0) && (
              <div style={panelStyles.empty}>
                No columns match{" "}
                <span style={{ color: AX.fg1, fontWeight: 600 }}>&ldquo;{query}&rdquo;</span>.
              </div>
            )}
          </>
        ) : (
          /* ── Visible & order tab ── */
          <div>
            <p style={panelStyles.reorderHint}>
              Drag rows to reorder. Logo and Name stay fixed as the first two columns.
              Filter-pinned columns are locked automatically.
            </p>

            {/* Frozen rows */}
            {(lockedMeta.length > 0 || filterPinnedMeta.length > 0) && (
              <ul style={{ ...panelStyles.rowList, marginBottom: 4 }}>
                {lockedMeta.map((col, i) => (
                  <FrozenColumnRow key={col.id} column={col} position={i + 1} />
                ))}
                {filterPinnedMeta.map((col, i) => (
                  <FrozenColumnRow
                    key={col.id}
                    column={col}
                    position={lockedMeta.length + i + 1}
                    lockTooltip={FILTER_PINNED_TOOLTIP}
                  />
                ))}
              </ul>
            )}

            {/* Draggable rows */}
            {orderedVisibleMeta.length > 0 ? (
              <ul style={panelStyles.rowList}>
                {orderedVisibleMeta
                  .filter((col) => !query || col.label.toLowerCase().includes(query.toLowerCase()))
                  .map((col, idx) => (
                    <ReorderRow
                      key={col.id}
                      column={col}
                      position={frozenColumnCount + idx + 1}
                      isSelected={selectedKey === col.columnKey}
                      isDragging={dragKey === col.columnKey}
                      isDragOver={dragOverKey === col.columnKey && dragKey !== col.columnKey}
                      onSelect={() => setSelectedKey(selectedKey === col.columnKey ? null : col.columnKey)}
                      onDragStart={() => { setDragKey(col.columnKey); setDragOverKey(null); }}
                      onDragOver={() => setDragOverKey(col.columnKey)}
                      onDrop={() => handleReorderDrop(col.columnKey)}
                      onDragEnd={() => { setDragKey(null); setDragOverKey(null); }}
                    />
                  ))}
              </ul>
            ) : (
              <div style={{ ...panelStyles.empty, paddingTop: 20 }}>
                No visible columns to reorder.{" "}
                <button
                  type="button"
                  onClick={() => setTab("all")}
                  style={{ background: "none", border: "none", color: AX.fgLink, cursor: "pointer", fontSize: 13, fontWeight: 600, padding: 0 }}
                >
                  Enable some columns first.
                </button>
              </div>
            )}

            {/* Keyboard hint */}
            {selectedKey && (
              <div style={panelStyles.keyboardHint}>
                <span style={{ flex: 1 }}>
                  <strong>{orderedVisibleMeta.find((c) => c.columnKey === selectedKey)?.label}</strong>
                  {" selected · use "}
                  <kbd style={panelStyles.kbd}>↑</kbd>{" "}
                  <kbd style={panelStyles.kbd}>↓</kbd>
                  {" or drag to move"}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedKey(null)}
                  style={{ background: "none", border: "none", color: "#93C5FD", cursor: "pointer", fontSize: 13, fontWeight: 600, padding: "0 2px" }}
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={panelStyles.footer}>
        <span style={panelStyles.footerCount}>
          <strong style={{ color: AX.fg1 }}>{visCount}</strong>
          <span style={{ color: AX.fg3 }}> / {allIds.length} visible</span>
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={reset} style={panelStyles.resetBtn}>
            Reset to default
          </button>
          <button type="button" onClick={handleDone} style={panelStyles.doneBtn}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

const panelStyles: Record<string, React.CSSProperties> = {
  panel: {
    position: "fixed",
    right: 0,
    top: 0,
    bottom: 0,
    width: 360,
    background: AX.bg1,
    borderLeft: `1px solid ${AX.border1}`,
    boxShadow: "-4px 0 24px rgba(17, 22, 29, 0.10)",
    display: "flex",
    flexDirection: "column",
    zIndex: 200,
    fontFamily: AX.fontSans,
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px 12px",
    borderBottom: `1px solid ${AX.border1}`,
    flexShrink: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: AX.fg1,
    letterSpacing: "-0.005em",
  },
  closeBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    background: "transparent",
    border: "none",
    borderRadius: 6,
    color: AX.fg3,
    cursor: "pointer",
    padding: 0,
    transition: "background 120ms, color 120ms",
  },
  searchWrap: {
    margin: "12px 16px 0",
    position: "relative",
    flexShrink: 0,
  },
  searchIconWrap: {
    position: "absolute",
    left: 10,
    top: "50%",
    transform: "translateY(-50%)",
    color: AX.fg4,
    display: "inline-flex",
    pointerEvents: "none",
  },
  searchInput: {
    width: "100%",
    padding: "8px 32px 8px 32px",
    fontSize: 13,
    fontFamily: "inherit",
    color: AX.fg1,
    background: AX.gray25,
    border: `1px solid ${AX.border1}`,
    borderRadius: 8,
    outline: "none",
    boxSizing: "border-box",
  },
  searchClear: {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: "translateY(-50%)",
    display: "inline-flex",
    alignItems: "center",
    background: "transparent",
    border: "none",
    color: AX.fg4,
    cursor: "pointer",
    padding: 2,
  },
  tabsRow: {
    display: "flex",
    gap: 0,
    padding: "12px 16px 0",
    borderBottom: `1px solid ${AX.border1}`,
    flexShrink: 0,
  },
  tab: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    fontFamily: "inherit",
    fontSize: 13,
    fontWeight: 500,
    color: AX.fg3,
    background: "transparent",
    border: "none",
    borderBottom: "2px solid transparent",
    cursor: "pointer",
    marginBottom: -1,
    transition: "color 120ms, border-color 120ms",
    whiteSpace: "nowrap",
  },
  tabActive: {
    color: AX.fg1,
    fontWeight: 600,
    borderBottomColor: AX.cyan700,
  },
  tabBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 20,
    height: 18,
    padding: "0 5px",
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 99,
    background: AX.gray100,
    color: AX.fg3,
    fontVariantNumeric: "tabular-nums",
  },
  tabBadgeActive: {
    background: "#DBEAFE",
    color: "#1D4ED8",
  },
  content: {
    flex: 1,
    overflowY: "auto",
    padding: "4px 12px 8px",
  },
  section: {
    padding: "12px 0 8px",
    borderBottom: `1px solid ${AX.border1}`,
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 4px 6px",
    gap: 8,
  },
  sectionName: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    color: AX.fg3,
    flex: 1,
    minWidth: 0,
  },
  sectionAction: {
    background: "transparent",
    border: `1px solid ${AX.border1}`,
    borderRadius: 5,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 600,
    color: AX.fg2,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "background 100ms, border-color 100ms",
  },
  rowList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  empty: {
    padding: "36px 8px",
    textAlign: "center",
    color: AX.fg3,
    fontSize: 13,
  },
  reorderHint: {
    fontSize: 12,
    color: AX.fg3,
    padding: "8px 4px 10px",
    lineHeight: 1.5,
    margin: 0,
  },
  keyboardHint: {
    margin: "10px 0 4px",
    padding: "8px 10px",
    background: "#EFF6FF",
    border: "1px solid #BFDBFE",
    borderRadius: 7,
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    color: "#1D4ED8",
  },
  kbd: {
    display: "inline-block",
    padding: "1px 4px",
    fontSize: 11,
    fontFamily: "inherit",
    background: "white",
    border: "1px solid #93C5FD",
    borderRadius: 4,
    color: "#1D4ED8",
    fontWeight: 600,
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px 16px",
    borderTop: `1px solid ${AX.border1}`,
    background: AX.bg2,
    flexShrink: 0,
    gap: 12,
  },
  footerCount: {
    fontSize: 13,
    fontVariantNumeric: "tabular-nums",
  },
  resetBtn: {
    padding: "7px 12px",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "inherit",
    color: AX.fg2,
    background: "white",
    border: `1px solid ${AX.border2}`,
    borderRadius: 7,
    cursor: "pointer",
  },
  doneBtn: {
    padding: "7px 18px",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "inherit",
    color: "white",
    background: AX.cyan700,
    border: `1px solid ${AX.cyan700}`,
    borderRadius: 7,
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(3, 112, 170, 0.20)",
  },
};

export { ALL_COMPANIES_COLUMN_META };
