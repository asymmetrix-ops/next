"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  COMPANIES_COLUMN_CATEGORIES,
  ALL_COMPANIES_COLUMN_META,
  PROD_DEFAULT_COMPANY_COLUMN_KEYS,
  columnKeysToVisibility,
  type CompanyColumnCategory,
  type CompanyColumnMeta,
  type CompanyColumnType,
} from "./companiesColumnCategories";

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
  warningBg: "#FFFBEB",
  accentAmber: "#B45309",
  accentAmberBg: "#FFFBEB",
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
      <rect
        x="2.25"
        y="5.25"
        width="7.5"
        height="5.5"
        rx="1.1"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M4 5.25V3.75a2 2 0 014 0v1.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M10.5 10.5L13.5 13.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
      <path
        d="M3 7a4 4 0 104-4M3 7l-1.4-1.4M3 7l1.4-1.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2.5 7.5L6 4l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TypeIcon({ type }: { type: CompanyColumnType }) {
  const wrap: React.CSSProperties = {
    width: 22,
    height: 22,
    borderRadius: 6,
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: AX.gray50,
    color: AX.gray600,
    border: `1px solid ${AX.gray200}`,
    fontFamily: AX.fontSans,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "-0.01em",
  };
  const moneyWrap = {
    ...wrap,
    color: AX.cyan700,
    background: AX.cyan50,
    borderColor: AX.cyan100,
  };
  const numWrap = {
    ...wrap,
    color: AX.positive,
    background: AX.positiveBg,
    borderColor: "#C6E8D6",
  };
  const pctWrap = {
    ...wrap,
    color: "#7A4E0E",
    background: AX.warningBg,
    borderColor: "#F2E1B4",
  };

  switch (type) {
    case "text":
      return <span style={wrap}>Aa</span>;
    case "paragraph":
      return (
        <span style={wrap}>
          <svg width="11" height="10" viewBox="0 0 12 10" fill="none">
            <path
              d="M1 1.5h10M1 5h10M1 8.5h6"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </span>
      );
    case "url":
      return (
        <span style={wrap}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path
              d="M3.5 8.5L8.5 3.5M4.5 3.5h4v4"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      );
    case "number":
      return <span style={numWrap}>#</span>;
    case "currency":
      return <span style={moneyWrap}>$</span>;
    case "percent":
      return <span style={pctWrap}>%</span>;
    case "date":
      return (
        <span style={wrap}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <rect
              x="1.5"
              y="2.5"
              width="9"
              height="8"
              rx="1.2"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <path
              d="M1.5 4.5h9M4 1.5v2M8 1.5v2"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </span>
      );
    case "logo":
      return (
        <span style={wrap}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M6 1.5v9" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </span>
      );
    case "follow":
      return (
        <span
          style={{
            ...wrap,
            color: AX.accentAmber,
            background: AX.accentAmberBg,
            borderColor: "#F0DDB0",
          }}
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
            <path d="M6 1.4l1.45 2.94 3.25.47-2.35 2.3.56 3.24L6 8.82 3.09 10.35l.56-3.24L1.3 4.81l3.25-.47L6 1.4z" />
          </svg>
        </span>
      );
    default:
      return <span style={wrap}>·</span>;
  }
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
    ? on
      ? AX.cyan400
      : AX.gray200
    : on
      ? AX.cyan700
      : AX.gray300;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!on)}
      style={{
        width: 34,
        height: 20,
        borderRadius: 999,
        background: bg,
        border: "none",
        padding: 0,
        position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 150ms ease-out",
        flexShrink: 0,
        opacity: disabled ? 0.85 : 1,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 16 : 2,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "white",
          boxShadow: "0 1px 2px rgba(17,22,29,0.18)",
          transition: "left 150ms ease-out",
        }}
      />
    </button>
  );
}

function TabPill({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...modalStyles.tab,
        background: active ? AX.gray900 : AX.gray100,
        color: active ? "white" : AX.fg2,
        borderColor: active ? AX.gray900 : AX.gray200,
      }}
    >
      <span style={{ fontWeight: 600 }}>{label}</span>
      {count !== undefined && (
        <span
          style={{
            fontWeight: 500,
            fontVariantNumeric: "tabular-nums",
            color: active ? "rgba(255,255,255,0.7)" : AX.fg3,
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function ColumnRow({
  column,
  visible,
  onToggle,
}: {
  column: CompanyColumnMeta;
  visible: boolean;
  onToggle: (on: boolean) => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <li
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 6px 8px 4px",
        borderRadius: 6,
        background: hover ? AX.gray25 : "transparent",
        transition: "background 120ms ease-out",
      }}
    >
      <TypeIcon type={column.type} />
      <span
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: visible ? AX.fg1 : AX.fg2,
          flex: "0 0 auto",
        }}
      >
        {column.label}
      </span>
      {column.badge && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "2px 6px",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: AX.cyan700,
            background: AX.cyan50,
            border: `1px solid ${AX.cyan100}`,
            borderRadius: 4,
          }}
        >
          {column.badge}
        </span>
      )}
      {column.locked && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "2px 6px 2px 5px",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: AX.fg3,
            background: AX.gray50,
            border: `1px solid ${AX.gray200}`,
            borderRadius: 4,
          }}
        >
          <LockIcon /> Frozen
        </span>
      )}
      <span style={{ flex: 1 }} />
      <Toggle
        on={visible}
        disabled={column.locked}
        onChange={onToggle}
        ariaLabel={`Show ${column.label}`}
      />
    </li>
  );
}

function ReorderRow({
  column,
  position,
  isSelected,
  isFirst,
  isLast,
  onSelect,
  onMoveUp,
  onMoveDown,
}: {
  column: CompanyColumnMeta;
  position: number;
  isSelected: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <li
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onSelect}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "7px 6px 7px 10px",
        borderRadius: 7,
        background: isSelected
          ? "#EFF6FF"
          : hover
            ? AX.gray25
            : "transparent",
        border: isSelected ? "1.5px solid #BFDBFE" : "1.5px solid transparent",
        cursor: "pointer",
        transition: "background 100ms ease-out, border-color 100ms ease-out",
        userSelect: "none",
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: isSelected ? "#1D4ED8" : AX.fg4,
          fontVariantNumeric: "tabular-nums",
          minWidth: 20,
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        {position}
      </span>
      <TypeIcon type={column.type} />
      <span
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: isSelected ? "#1E40AF" : AX.fg1,
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {column.label}
      </span>
      {column.badge && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "2px 6px",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: AX.cyan700,
            background: AX.cyan50,
            border: `1px solid ${AX.cyan100}`,
            borderRadius: 4,
            flexShrink: 0,
          }}
        >
          {column.badge}
        </span>
      )}
      <div style={{ display: "flex", gap: 3, flexShrink: 0, marginLeft: 4 }} onClick={e => e.stopPropagation()}>
        <button
          type="button"
          title="Move up"
          disabled={isFirst}
          onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
          style={{
            width: 26,
            height: 26,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: isFirst ? AX.gray50 : isSelected ? "white" : AX.gray50,
            border: `1px solid ${isFirst ? AX.gray100 : AX.gray200}`,
            borderRadius: 5,
            cursor: isFirst ? "not-allowed" : "pointer",
            color: isFirst ? AX.fg4 : AX.fg2,
            padding: 0,
            transition: "background 100ms, border-color 100ms",
          }}
        >
          <ChevronUpIcon />
        </button>
        <button
          type="button"
          title="Move down"
          disabled={isLast}
          onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
          style={{
            width: 26,
            height: 26,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: isLast ? AX.gray50 : isSelected ? "white" : AX.gray50,
            border: `1px solid ${isLast ? AX.gray100 : AX.gray200}`,
            borderRadius: 5,
            cursor: isLast ? "not-allowed" : "pointer",
            color: isLast ? AX.fg4 : AX.fg2,
            padding: 0,
            transition: "background 100ms, border-color 100ms",
          }}
        >
          <ChevronDownIcon />
        </button>
      </div>
    </li>
  );
}

function FrozenColumnRow({
  column,
  position,
}: {
  column: CompanyColumnMeta;
  position: number;
}) {
  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "7px 6px 7px 10px",
        borderRadius: 7,
        background: "#FFFBEB",
        border: "1.5px solid #F3E8C8",
        marginBottom: 3,
        userSelect: "none",
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#D97706",
          fontVariantNumeric: "tabular-nums",
          minWidth: 20,
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        {position}
      </span>
      <TypeIcon type={column.type} />
      <span
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: AX.fg1,
          flex: 1,
        }}
      >
        {column.label}
      </span>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "2px 7px 2px 6px",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "#B45309",
          background: "#FFFBEB",
          border: "1px solid #F0DDB0",
          borderRadius: 4,
          flexShrink: 0,
        }}
      >
        <LockIcon /> Frozen
      </span>
    </li>
  );
}

export interface ColumnsControlRoomProps {
  initial: Record<string, boolean>;
  initialOrder?: string[];
  onClose: () => void;
  onApply: (visible: Record<string, boolean>, order?: string[]) => void;
  categories?: CompanyColumnCategory[];
  title?: string;
  subtitle?: string;
}

export function ColumnsControlRoom({
  initial,
  initialOrder,
  onClose,
  onApply,
  categories = COMPANIES_COLUMN_CATEGORIES,
  title = "Customise columns",
  subtitle = "Choose and reorder the columns shown in Companies Search.",
}: ColumnsControlRoomProps) {
  const buildState = (mode?: "default") => {
    const out: Record<string, boolean> = {};
    for (const cat of categories) {
      for (const column of cat.columns) {
        if (mode === "default") {
          out[column.id] = column.defaultVisible;
        } else {
          out[column.id] = initial?.[column.id] ?? column.defaultVisible;
        }
      }
    }
    return out;
  };

  const [visible, setVisible] = useState(() => buildState());
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "visible" | "hidden" | "reorder">("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const allMeta = useMemo(
    () => categories.flatMap((cat) => cat.columns),
    [categories]
  );
  const lockedMeta = useMemo(() => allMeta.filter((c) => c.locked), [allMeta]);
  const lockedColumnKeys = useMemo(
    () => new Set(lockedMeta.map((c) => c.columnKey)),
    [lockedMeta]
  );

  const [orderedKeys, setOrderedKeys] = useState<string[]>(() => {
    const visibleIds = new Set(
      Object.entries(initial)
        .filter(([, v]) => v)
        .map(([k]) => k)
    );
    const visibleColumnKeys = allMeta
      .filter((c) => !c.locked && visibleIds.has(c.id))
      .map((c) => c.columnKey);
    const visibleKeySet = new Set(visibleColumnKeys);

    if (initialOrder && initialOrder.length > 0) {
      const result = initialOrder.filter(
        (k) => !lockedColumnKeys.has(k) && visibleKeySet.has(k)
      );
      visibleColumnKeys.forEach((k) => {
        if (!result.includes(k)) result.push(k);
      });
      return result;
    }
    return visibleColumnKeys;
  });

  const toggle = useCallback((id: string, on: boolean) => {
    setVisible((current) => ({ ...current, [id]: on }));
    const meta = allMeta.find((c) => c.id === id);
    if (!meta || meta.locked) return;
    setOrderedKeys((current) => {
      if (on) {
        return current.includes(meta.columnKey)
          ? current
          : [...current, meta.columnKey];
      } else {
        return current.filter((k) => k !== meta.columnKey);
      }
    });
  }, [allMeta]);

  const allIds = useMemo(
    () => categories.flatMap((category) => category.columns.map((column) => column.id)),
    [categories]
  );
  const visCount = allIds.filter((id) => visible[id]).length;
  const hiddenCount = allIds.length - visCount;

  const reset = () => {
    const defaultVisible = columnKeysToVisibility([...PROD_DEFAULT_COMPANY_COLUMN_KEYS]);
    setVisible(defaultVisible);
    const defaultVisibleKeys = allMeta
      .filter((c) => !c.locked && defaultVisible[c.id])
      .map((c) => c.columnKey);
    setOrderedKeys(defaultVisibleKeys);
    setSelectedKey(null);
  };

  const filterCol = (column: CompanyColumnMeta) => {
    if (query && !column.label.toLowerCase().includes(query.toLowerCase())) {
      return false;
    }
    if (tab === "visible" && !visible[column.id]) return false;
    if (tab === "hidden" && visible[column.id]) return false;
    return true;
  };

  const orderedVisibleMeta = useMemo(() => {
    return orderedKeys
      .map((k) => allMeta.find((c) => c.columnKey === k && !c.locked))
      .filter((c): c is CompanyColumnMeta => Boolean(c));
  }, [orderedKeys, allMeta]);

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
    if (tab !== "reorder" || !selectedKey) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        moveUp(selectedKey);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        moveDown(selectedKey);
      } else if (e.key === "Escape") {
        setSelectedKey(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tab, selectedKey, moveUp, moveDown]);

  const handleApply = () => {
    const lockedVisibleKeys = lockedMeta
      .filter((c) => visible[c.id])
      .map((c) => c.columnKey);
    const finalOrder = [...lockedVisibleKeys, ...orderedKeys];
    onApply(visible, finalOrder);
  };

  return (
    <div style={modalStyles.scrim} onClick={onClose} role="presentation">
      <div
        style={modalStyles.modal}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="columns-control-room-title"
      >
        <div style={modalStyles.header}>
          <div>
            <div id="columns-control-room-title" style={modalStyles.title}>
              {title}
            </div>
            <div style={modalStyles.subtitle}>{subtitle}</div>
          </div>
          <div style={modalStyles.count}>
            <span style={{ fontWeight: 700, color: AX.fg1 }}>{visCount}</span>
            <span style={{ color: AX.fg3 }}> of </span>
            <span style={{ color: AX.fg2 }}>{allIds.length}</span>
            <span style={{ color: AX.fg3 }}> visible</span>
          </div>
        </div>

        <div style={modalStyles.searchWrap}>
          <span style={modalStyles.searchIcon}>
            <SearchIcon />
          </span>
          <input
            type="text"
            placeholder={tab === "reorder" ? "Search to filter…" : "Search columns…"}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            style={modalStyles.searchInput}
          />
        </div>

        <div style={modalStyles.tabsRow}>
          <div style={modalStyles.tabs}>
            <TabPill
              active={tab === "all"}
              onClick={() => setTab("all")}
              label="All"
              count={allIds.length}
            />
            <TabPill
              active={tab === "visible"}
              onClick={() => setTab("visible")}
              label="Visible"
              count={visCount}
            />
            <TabPill
              active={tab === "hidden"}
              onClick={() => setTab("hidden")}
              label="Hidden"
              count={hiddenCount}
            />
            <TabPill
              active={tab === "reorder"}
              onClick={() => { setTab("reorder"); setQuery(""); }}
              label="Reorder"
            />
          </div>
          <button type="button" onClick={reset} style={modalStyles.reset}>
            <ResetIcon /> Reset
          </button>
        </div>

        <div style={modalStyles.list}>
          {tab === "reorder" ? (
            <div>
              <div style={{
                fontSize: 12,
                color: AX.fg3,
                padding: "4px 10px 10px",
                lineHeight: 1.5,
              }}>
                Click a row to select it, then use{" "}
                <kbd style={modalStyles.kbd}>▲</kbd>{" "}
                <kbd style={modalStyles.kbd}>▼</kbd>{" "}
                buttons or keyboard arrow keys to reposition. Logo and Name are frozen to the first two columns.
              </div>

              <ul style={{ ...modalStyles.rowList, paddingBottom: 8 }}>
                {lockedMeta.map((col, i) => (
                  <FrozenColumnRow key={col.id} column={col} position={i + 1} />
                ))}
              </ul>

              {orderedVisibleMeta.length > 0 ? (
                <ul style={modalStyles.rowList}>
                  {orderedVisibleMeta
                    .filter((col) =>
                      !query ||
                      col.label.toLowerCase().includes(query.toLowerCase())
                    )
                    .map((col, idx, arr) => (
                      <ReorderRow
                        key={col.id}
                        column={col}
                        position={lockedMeta.length + idx + 1}
                        isSelected={selectedKey === col.columnKey}
                        isFirst={idx === 0}
                        isLast={idx === arr.length - 1}
                        onSelect={() =>
                          setSelectedKey(
                            selectedKey === col.columnKey ? null : col.columnKey
                          )
                        }
                        onMoveUp={() => moveUp(col.columnKey)}
                        onMoveDown={() => moveDown(col.columnKey)}
                      />
                    ))}
                </ul>
              ) : (
                <div style={{ ...modalStyles.empty, paddingTop: 24 }}>
                  No reorderable visible columns.{" "}
                  <button
                    type="button"
                    onClick={() => setTab("all")}
                    style={{
                      background: "none",
                      border: "none",
                      color: AX.fgLink,
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 600,
                      padding: 0,
                    }}
                  >
                    Enable some columns first.
                  </button>
                </div>
              )}

              {selectedKey && (
                <div style={{
                  margin: "10px 0 4px",
                  padding: "8px 12px",
                  background: "#EFF6FF",
                  border: "1px solid #BFDBFE",
                  borderRadius: 7,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                  color: "#1D4ED8",
                }}>
                  <span style={{ flex: 1 }}>
                    <strong>
                      {orderedVisibleMeta.find(c => c.columnKey === selectedKey)?.label}
                    </strong>{" "}selected · use{" "}
                    <kbd style={{ ...modalStyles.kbd, borderColor: "#93C5FD", background: "white" }}>↑</kbd>{" "}
                    <kbd style={{ ...modalStyles.kbd, borderColor: "#93C5FD", background: "white" }}>↓</kbd>{" "}
                    to move
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedKey(null)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#93C5FD",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                      padding: "0 2px",
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {categories.map((category) => {
                const cols = category.columns.filter(filterCol);
                if (cols.length === 0) return null;
                const onCount = category.columns.filter((column) => visible[column.id]).length;
                return (
                  <section key={category.id} style={modalStyles.section}>
                    <header style={modalStyles.sectionHead}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: 10,
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: AX.fg3,
                          }}
                        >
                          {category.name}
                        </span>
                        {category.description && (
                          <span
                            style={{
                              fontSize: 12,
                              color: AX.fg3,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {category.description}
                          </span>
                        )}
                      </div>
                      <span style={modalStyles.sectionCount}>
                        {onCount}
                        <span style={{ color: AX.fg4 }}>/{category.columns.length}</span>
                      </span>
                    </header>
                    <ul style={modalStyles.rowList}>
                      {cols.map((column) => (
                        <ColumnRow
                          key={column.id}
                          column={column}
                          visible={!!visible[column.id]}
                          onToggle={(on) => toggle(column.id, on)}
                        />
                      ))}
                    </ul>
                  </section>
                );
              })}

              {categories.every(
                (category) => category.columns.filter(filterCol).length === 0
              ) && (
                <div style={modalStyles.empty}>
                  No columns match{" "}
                  <span style={{ color: AX.fg1, fontWeight: 600 }}>&quot;{query}&quot;</span>
                  {tab !== "all" && (
                    <>
                      {" "}
                      in <em style={{ fontStyle: "normal", fontWeight: 600 }}>{tab}</em>
                    </>
                  )}
                  .
                </div>
              )}
            </>
          )}
        </div>

        <div style={modalStyles.footer}>
          <div style={modalStyles.footerMeta}>
            <span style={{ fontWeight: 600, color: AX.fg1 }}>{visCount}</span>
            <span style={{ color: AX.fg3 }}>
              {" "}
              column{visCount === 1 ? "" : "s"} will be shown
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={onClose} style={modalStyles.btnSecondary}>
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              style={modalStyles.btnPrimary}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const modalStyles: Record<string, React.CSSProperties> = {
  scrim: {
    position: "fixed",
    inset: 0,
    background: "rgba(17, 22, 29, 0.40)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "64px 24px 32px",
    zIndex: 100,
    backdropFilter: "blur(2px)",
  },
  modal: {
    width: 560,
    maxWidth: "100%",
    maxHeight: "calc(100vh - 96px)",
    background: AX.bg1,
    borderRadius: 12,
    border: `1px solid ${AX.border1}`,
    boxShadow:
      "0 24px 64px rgba(17, 22, 29, 0.20), 0 4px 12px rgba(17, 22, 29, 0.06)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    fontFamily: AX.fontSans,
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    padding: "20px 24px 14px",
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: AX.fg1,
    letterSpacing: "-0.005em",
  },
  subtitle: {
    fontSize: 13,
    color: AX.fg3,
    marginTop: 2,
  },
  count: {
    fontSize: 13,
    whiteSpace: "nowrap",
    paddingTop: 4,
    fontVariantNumeric: "tabular-nums",
  },
  searchWrap: {
    margin: "0 24px",
    position: "relative",
  },
  searchIcon: {
    position: "absolute",
    left: 12,
    top: "50%",
    transform: "translateY(-50%)",
    color: AX.fg4,
    display: "inline-flex",
  },
  searchInput: {
    width: "100%",
    padding: "9px 12px 9px 34px",
    fontSize: 14,
    fontFamily: "inherit",
    color: AX.fg1,
    background: AX.gray25,
    border: `1px solid ${AX.border1}`,
    borderRadius: 8,
    outline: "none",
    boxSizing: "border-box",
  },
  tabsRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 24px 10px",
    flexWrap: "wrap",
    gap: 8,
  },
  tabs: { display: "flex", gap: 6, flexWrap: "wrap" },
  tab: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 11px",
    fontFamily: "inherit",
    fontSize: 13,
    borderRadius: 999,
    border: "1px solid",
    cursor: "pointer",
    transition: "background 120ms ease-out, color 120ms ease-out",
  },
  reset: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    background: "transparent",
    border: "none",
    padding: 4,
    color: AX.fgLink,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "inherit",
    cursor: "pointer",
  },
  list: {
    flex: 1,
    overflowY: "auto",
    padding: "6px 18px 4px 20px",
    margin: "0 4px",
    minHeight: 200,
  },
  section: { padding: "10px 0 14px" },
  sectionHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 6px 6px",
    borderBottom: `1px solid #E5E7EB`,
    marginBottom: 4,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: 600,
    color: AX.fg2,
    fontVariantNumeric: "tabular-nums",
  },
  rowList: { listStyle: "none", padding: 0, margin: 0 },
  empty: {
    padding: "40px 12px",
    textAlign: "center",
    color: AX.fg3,
    fontSize: 14,
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 20px 18px",
    borderTop: `1px solid ${AX.border1}`,
    background: AX.bg2,
    gap: 16,
  },
  footerMeta: {
    fontSize: 13,
  },
  btnSecondary: {
    padding: "8px 18px",
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "inherit",
    color: AX.fg1,
    background: "white",
    border: `1px solid ${AX.border2}`,
    borderRadius: 8,
    cursor: "pointer",
  },
  btnPrimary: {
    padding: "8px 22px",
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "inherit",
    color: "white",
    background: AX.cyan700,
    border: `1px solid ${AX.cyan700}`,
    borderRadius: 8,
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(3, 112, 170, 0.20)",
  },
  kbd: {
    display: "inline-block",
    padding: "1px 5px",
    fontSize: 11,
    fontFamily: "inherit",
    background: AX.gray50,
    border: `1px solid ${AX.gray200}`,
    borderRadius: 4,
    color: AX.fg2,
    fontWeight: 600,
  },
};

export { ALL_COMPANIES_COLUMN_META };
