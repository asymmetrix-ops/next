"use client";

import React, { useMemo, useState } from "react";
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

function DragHandle({ disabled }: { disabled?: boolean }) {
  return (
    <svg
      width="10"
      height="16"
      viewBox="0 0 10 16"
      fill="none"
      style={{
        flexShrink: 0,
        opacity: disabled ? 0.25 : 0.55,
        cursor: disabled ? "not-allowed" : "grab",
      }}
    >
      {[2, 7, 12].flatMap((y, i) => [
        <circle key={`l${i}`} cx="2" cy={y} r="1.2" fill="currentColor" />,
        <circle key={`r${i}`} cx="8" cy={y} r="1.2" fill="currentColor" />,
      ])}
    </svg>
  );
}

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
  count: number;
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
      <span
        style={{
          fontWeight: 500,
          fontVariantNumeric: "tabular-nums",
          color: active ? "rgba(255,255,255,0.7)" : AX.fg3,
        }}
      >
        {count}
      </span>
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
      <span style={{ color: AX.gray400, display: "inline-flex" }}>
        <DragHandle disabled={column.locked} />
      </span>
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
          <LockIcon /> Locked
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

export interface ColumnsControlRoomProps {
  initial: Record<string, boolean>;
  onClose: () => void;
  onApply: (visible: Record<string, boolean>) => void;
  categories?: CompanyColumnCategory[];
  title?: string;
  subtitle?: string;
}

export function ColumnsControlRoom({
  initial,
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
  const [tab, setTab] = useState<"all" | "visible" | "hidden">("all");

  const allIds = useMemo(
    () => categories.flatMap((category) => category.columns.map((column) => column.id)),
    [categories]
  );
  const visCount = allIds.filter((id) => visible[id]).length;
  const hiddenCount = allIds.length - visCount;

  const toggle = (id: string, on: boolean) =>
    setVisible((current) => ({ ...current, [id]: on }));

  const reset = () =>
    setVisible(columnKeysToVisibility([...PROD_DEFAULT_COMPANY_COLUMN_KEYS]));

  const filterCol = (column: CompanyColumnMeta) => {
    if (query && !column.label.toLowerCase().includes(query.toLowerCase())) {
      return false;
    }
    if (tab === "visible" && !visible[column.id]) return false;
    if (tab === "hidden" && visible[column.id]) return false;
    return true;
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
            placeholder="Search columns…"
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
          </div>
          <button type="button" onClick={reset} style={modalStyles.reset}>
            <ResetIcon /> Reset
          </button>
        </div>

        <div style={modalStyles.list}>
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
              onClick={() => onApply(visible)}
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
  },
  tabs: { display: "flex", gap: 6 },
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
    borderBottom: `1px solid ${AX.gray100}`,
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
};

export { ALL_COMPANIES_COLUMN_META };
