"use client";

import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from "react";

// ── Types ──────────────────────────────────────────────────────────────────

export interface FilterCategory {
  id: string;
  name: string;
}

export type FilterEditorType = "enum" | "range" | "segmented" | "boolean";
export type FilterTypeIcon = "Aa" | "#" | "$" | "%" | "date";

export interface FilterDef {
  id: string;
  label: string;
  fullLabel: string;
  category: string;
  type: FilterTypeIcon;
  editor: FilterEditorType;
  options?: string[];
  unit?: string;
  min?: number;
  max?: number;
  presets?: [string, number, number][];
}

export interface FilterItem {
  id: string;
  value: unknown;
}

export interface FilterBarState {
  filters: FilterItem[];
  viewId: string | null;
  searchText: string;
}

export interface CompaniesFilterBarProps {
  filterDefs: FilterDef[];
  filterCategories: FilterCategory[];
  state: FilterBarState;
  onStateChange: (
    updater: FilterBarState | ((prev: FilterBarState) => FilterBarState)
  ) => void;
  totalCount?: number;
}

// ── CSS variables scoped to the component ─────────────────────────────────

const FILTER_BAR_CSS = `
  .cfb-root {
    --ax-cyan-700: #0075df;
    --ax-cyan-400: #54a8ff;
    --ax-cyan-50:  #eff7ff;
    --ax-cyan-200: #b3d9ff;
    --ax-cyan-100: #cce7ff;
    --ax-cyan-300: #80c2ff;
    --border-1:    #e2e8f0;
    --fg-1:  #0f172a;
    --fg-2:  #334155;
    --fg-3:  #64748b;
    --fg-4:  #94a3b8;
    --fg-link: #2563eb;
    --ax-gray-25:  #f9fafb;
    --ax-gray-50:  #f1f5f9;
    --ax-gray-100: #e2e8f0;
    --ax-gray-200: #cbd5e1;
    --ax-gray-300: #94a3b8;
    --ax-gray-500: #64748b;
    --ax-gray-900: #0f172a;
    --r-lg:  10px;
    --r-md:  6px;
    --r-sm:  4px;
    --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --font-mono: ui-monospace, 'SFMono-Regular', monospace;
    --fs-12: 12px;
    --fs-13: 13px;
    --fs-14: 14px;
    --ax-positive:    #1f8a5b;
    --ax-positive-bg: #e8f5e9;
    --ax-negative:    #dc2626;
    --ax-warning-bg:  #fef3c7;
    --ax-accent-amber:#d97706;
  }
  .cfb-root { font-family: var(--font-sans); }
  .cfb-root .ax-eyebrow {
    font-size: 10px; font-weight: 700;
    letter-spacing: 0.06em; text-transform: uppercase;
    color: var(--fg-4);
  }
  .cfb-root .ax-numeric { font-variant-numeric: tabular-nums; }
`;

// ── Pop (floating anchored popover) ────────────────────────────────────────

interface PopProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  onDismiss: () => void;
  children: React.ReactNode;
  offset?: number;
  align?: "start" | "end";
}

function Pop({
  anchorRef,
  onDismiss,
  children,
  offset = 8,
  align = "start",
}: PopProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    function place() {
      if (!anchorRef.current || !ref.current) return;
      const a = anchorRef.current.getBoundingClientRect();
      const p = ref.current.getBoundingClientRect();
      let left = align === "end" ? a.right - p.width : a.left;
      const vw = window.innerWidth;
      if (left + p.width > vw - 8) left = vw - p.width - 8;
      if (left < 8) left = 8;
      setPos({ top: a.bottom + offset, left });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchorRef, align, offset]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!ref.current) return;
      if (ref.current.contains(e.target as Node)) return;
      if (
        anchorRef.current &&
        anchorRef.current.contains(e.target as Node)
      )
        return;
      onDismiss();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onDismiss, anchorRef]);

  return (
    <div
      ref={ref}
      style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
    >
      {children}
    </div>
  );
}

// ── TypeChip (field type icon) ──────────────────────────────────────────────

function TypeChip({ type }: { type: FilterTypeIcon }) {
  const base: React.CSSProperties = {
    width: 22,
    height: 22,
    borderRadius: 6,
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-sans)",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "-0.01em",
    background: "var(--ax-gray-50)",
    color: "var(--ax-gray-600, #64748b)",
    border: "1px solid var(--ax-gray-200)",
  };
  if (type === "$")
    return (
      <span
        style={{
          ...base,
          color: "var(--ax-cyan-700)",
          background: "var(--ax-cyan-50)",
          borderColor: "var(--ax-cyan-100)",
        }}
      >
        $
      </span>
    );
  if (type === "#")
    return (
      <span
        style={{
          ...base,
          color: "var(--ax-positive)",
          background: "var(--ax-positive-bg)",
          borderColor: "#C6E8D6",
        }}
      >
        #
      </span>
    );
  if (type === "%")
    return (
      <span
        style={{
          ...base,
          color: "#7A4E0E",
          background: "var(--ax-warning-bg)",
          borderColor: "#F2E1B4",
        }}
      >
        %
      </span>
    );
  if (type === "date")
    return (
      <span style={base}>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <rect
            x="1.5"
            y="2.5"
            width="9"
            height="8"
            rx="1"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <path d="M1.5 4.5h9" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </span>
    );
  return <span style={base}>Aa</span>;
}

// ── Summarize filter value ──────────────────────────────────────────────────

function formatRangeValue(
  v: { min?: number; max?: number } | null | undefined,
  unit?: string
): string {
  if (!v) return "";
  const fmt = (n: number) => {
    if (unit === "$m" && Math.abs(n) >= 1000)
      return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}b`;
    if (unit === "$m") return `$${n}m`;
    if (unit === "$k") return `$${n}k`;
    if (unit === "%") return `${n}%`;
    if (unit === "x") return `${n}x`;
    if (unit === "yrs") return `${n}y`;
    return n.toLocaleString();
  };
  if (v.min !== undefined && v.max !== undefined)
    return `${fmt(v.min)} – ${fmt(v.max)}`;
  if (v.min !== undefined) return `≥ ${fmt(v.min)}`;
  if (v.max !== undefined) return `≤ ${fmt(v.max)}`;
  return "";
}

function summarize(def: FilterDef, value: unknown): string {
  if (value == null) return "";
  if (def.editor === "enum") {
    if (!Array.isArray(value) || value.length === 0) return "";
    if (value.length === 1) return String(value[0]);
    return `${String(value[0])} +${value.length - 1}`;
  }
  if (def.editor === "range")
    return formatRangeValue(
      value as { min?: number; max?: number },
      def.unit
    );
  if (def.editor === "segmented") return String(value);
  if (def.editor === "boolean") return (value as boolean) ? "On" : "Off";
  return "";
}

// ── Chip ───────────────────────────────────────────────────────────────────

interface ChipProps {
  def: FilterDef;
  value: unknown;
  chipStyle?: "cyan" | "neutral" | "outlined";
  showIcon?: boolean;
  onEdit: () => void;
  onRemove: () => void;
}

function Chip({
  def,
  value,
  chipStyle = "neutral",
  showIcon = false,
  onEdit,
  onRemove,
}: ChipProps) {
  const [hover, setHover] = useState(false);
  const summary = summarize(def, value);

  let bg: string,
    fg: string,
    border: string,
    valueFg: string,
    sepColor: string;
  if (chipStyle === "cyan") {
    bg = "var(--ax-cyan-50)";
    fg = "var(--ax-cyan-700)";
    border = "var(--ax-cyan-100)";
    valueFg = "var(--ax-cyan-700)";
    sepColor = "var(--ax-cyan-200)";
  } else if (chipStyle === "outlined") {
    bg = "white";
    fg = "var(--fg-2)";
    border = "var(--ax-cyan-300)";
    valueFg = "var(--ax-cyan-700)";
    sepColor = "var(--ax-cyan-100)";
  } else {
    bg = "var(--ax-gray-50)";
    fg = "var(--fg-3)";
    border = "var(--border-1)";
    valueFg = "var(--fg-1)";
    sepColor = "var(--ax-gray-200)";
  }

  return (
    <span
      onClick={onEdit}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: "var(--r-md)",
        fontSize: "var(--fs-13)",
        fontFamily: "var(--font-sans)",
        cursor: "pointer",
        userSelect: "none",
        transition: "box-shadow 120ms",
        boxShadow: hover ? "0 1px 2px rgba(17,22,29,0.08)" : "none",
        height: 30,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "0 8px 0 10px",
          color: fg,
          fontWeight: 500,
        }}
      >
        {showIcon && <TypeChip type={def.type} />}
        <span>{def.label}:</span>
      </span>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "0 8px",
          color: valueFg,
          fontWeight: 600,
          borderLeft: `1px dashed ${sepColor}`,
        }}
      >
        {summary}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label={`Remove ${def.label} filter`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 24,
          alignSelf: "stretch",
          padding: "0 6px 0 2px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: hover ? valueFg : "var(--fg-4)",
        }}
      >
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <path
            d="M3 3l6 6M9 3l-6 6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </span>
  );
}

// ── AddFilterPicker ────────────────────────────────────────────────────────

interface PickerRowProps {
  def: FilterDef;
  onPick: () => void;
}

function PickerRow({ def, onPick }: PickerRowProps) {
  const [hover, setHover] = useState(false);
  const hint =
    def.editor === "enum"
      ? `${def.options?.length ?? 0} options`
      : def.editor === "range"
        ? `range${def.unit ? ` (${def.unit})` : ""}`
        : def.editor === "segmented"
          ? "choice"
          : def.editor === "boolean"
            ? "toggle"
            : "";
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "7px 8px",
          borderRadius: 6,
          background: hover ? "var(--ax-gray-25)" : "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "inherit",
        }}
      >
        <TypeChip type={def.type} />
        <span
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          <span
            style={{
              fontSize: "var(--fs-13)",
              fontWeight: 500,
              color: "var(--fg-1)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {def.label}
          </span>
          {def.fullLabel !== def.label && (
            <span
              style={{
                fontSize: 11,
                color: "var(--fg-3)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {def.fullLabel}
            </span>
          )}
        </span>
        <span style={{ fontSize: 10.5, color: "var(--fg-4)", flexShrink: 0 }}>
          {hint}
        </span>
        <span
          style={{
            opacity: hover ? 1 : 0,
            color: "var(--ax-cyan-700)",
            flexShrink: 0,
            transition: "opacity 120ms",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 6h8M6 2v8"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </button>
    </li>
  );
}

interface AddFilterPickerProps {
  availableDefs: FilterDef[];
  categories: FilterCategory[];
  onPick: (def: FilterDef) => void;
  onClose: () => void;
}

function AddFilterPicker({
  availableDefs,
  categories,
  onPick,
  onClose,
}: AddFilterPickerProps) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase().trim();
    if (!ql) return availableDefs;
    return availableDefs.filter(
      (d) =>
        d.label.toLowerCase().includes(ql) ||
        d.fullLabel.toLowerCase().includes(ql) ||
        d.category.toLowerCase().includes(ql)
    );
  }, [q, availableDefs]);

  const byCat = useMemo(() => {
    const map: Record<string, FilterDef[]> = {};
    for (const c of categories) map[c.id] = [];
    for (const d of filtered) {
      if (!map[d.category]) map[d.category] = [];
      map[d.category].push(d);
    }
    return map;
  }, [filtered, categories]);

  const kbdStyle: React.CSSProperties = {
    display: "inline-block",
    padding: "0 4px",
    background: "white",
    border: "1px solid var(--border-1)",
    borderRadius: 3,
    fontFamily: "var(--font-mono)",
    fontSize: 10,
    color: "var(--fg-2)",
  };

  return (
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
      {/* Header */}
      <div
        style={{
          padding: "12px 14px 10px",
          borderBottom: "1px solid var(--ax-gray-100)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontSize: "var(--fs-14)",
              fontWeight: 700,
              color: "var(--fg-1)",
            }}
          >
            Add filter
          </div>
          <div
            style={{ fontSize: 11, color: "var(--fg-4)" }}
            className="ax-numeric"
          >
            {availableDefs.length} available
          </div>
        </div>
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
            <circle
              cx="7"
              cy="7"
              r="4.75"
              stroke="currentColor"
              strokeWidth="1.4"
            />
            <path
              d="M10.5 10.5L13.5 13.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search filters…"
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
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                color: "var(--fg-4)",
                display: "inline-flex",
              }}
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path
                  d="M3 3l6 6M9 3l-6 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 6px 8px" }}>
        {categories.map((cat) => {
          const defs = byCat[cat.id];
          if (!defs || defs.length === 0) return null;
          return (
            <section key={cat.id} style={{ padding: "6px 8px 4px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  padding: "4px 4px 6px",
                }}
              >
                <span className="ax-eyebrow" style={{ fontSize: 10.5 }}>
                  {cat.name}
                </span>
                <span
                  className="ax-numeric"
                  style={{ fontSize: 10.5, color: "var(--fg-4)" }}
                >
                  {defs.length}
                </span>
              </div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {defs.map((d) => (
                  <PickerRow
                    key={d.id}
                    def={d}
                    onPick={() => {
                      onPick(d);
                      onClose();
                    }}
                  />
                ))}
              </ul>
            </section>
          );
        })}
        {filtered.length === 0 && (
          <div
            style={{
              padding: 36,
              textAlign: "center",
              color: "var(--fg-4)",
              fontSize: "var(--fs-13)",
            }}
          >
            No filters match{" "}
            <strong style={{ color: "var(--fg-2)", fontWeight: 600 }}>
              &ldquo;{q}&rdquo;
            </strong>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "8px 14px",
          borderTop: "1px solid var(--ax-gray-100)",
          background: "var(--ax-gray-25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 11,
          color: "var(--fg-3)",
        }}
      >
        <span>
          <kbd style={kbdStyle}>↑↓</kbd> navigate · <kbd style={kbdStyle}>↵</kbd> add
        </span>
        <span style={{ color: "var(--fg-link)" }}>Same fields as columns</span>
      </div>
    </div>
  );
}

// ── AddFilterButton ────────────────────────────────────────────────────────

interface AddFilterButtonProps {
  availableDefs: FilterDef[];
  categories: FilterCategory[];
  onPick: (def: FilterDef) => void;
}

function AddFilterButton({
  availableDefs,
  categories,
  onPick,
}: AddFilterButtonProps) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={anchor}
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 12px 5px 9px",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--fs-13)",
          fontWeight: 600,
          color: open ? "var(--ax-cyan-700)" : "var(--fg-2)",
          background: open ? "var(--ax-cyan-50)" : "white",
          border: `1px dashed ${open ? "var(--ax-cyan-300)" : "var(--ax-gray-300, #94a3b8)"}`,
          borderRadius: "var(--r-md)",
          cursor: "pointer",
          transition: "all 120ms",
          height: 30,
          whiteSpace: "nowrap",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M2 6h8M6 2v8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        Add filter
      </button>
      {open && (
        <Pop
          anchorRef={anchor}
          onDismiss={() => setOpen(false)}
        >
          <AddFilterPicker
            availableDefs={availableDefs}
            categories={categories}
            onPick={(def) => {
              setOpen(false);
              onPick(def);
            }}
            onClose={() => setOpen(false)}
          />
        </Pop>
      )}
    </>
  );
}

// ── Filter editors ─────────────────────────────────────────────────────────

interface EditorShellProps {
  title: string;
  hint?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  width?: number;
}

function EditorShell({
  title,
  hint,
  footer,
  children,
  width = 320,
}: EditorShellProps) {
  return (
    <div
      style={{
        width,
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
          padding: "10px 14px 8px",
          borderBottom: "1px solid var(--ax-gray-100)",
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div
          style={{
            fontSize: "var(--fs-13)",
            fontWeight: 700,
            color: "var(--fg-1)",
          }}
        >
          {title}
        </div>
        {hint && (
          <div style={{ fontSize: 11, color: "var(--fg-4)" }}>{hint}</div>
        )}
      </div>
      <div style={{ padding: "10px 14px 12px" }}>{children}</div>
      {footer && (
        <div
          style={{
            padding: "8px 12px",
            borderTop: "1px solid var(--ax-gray-100)",
            background: "var(--ax-gray-25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}

const btnGhost: React.CSSProperties = {
  padding: "6px 10px",
  fontSize: "var(--fs-13)",
  fontWeight: 500,
  fontFamily: "inherit",
  background: "transparent",
  color: "var(--fg-2)",
  border: "none",
  borderRadius: "var(--r-sm)",
  cursor: "pointer",
};
const btnPrimary: React.CSSProperties = {
  padding: "6px 14px",
  fontSize: "var(--fs-13)",
  fontWeight: 600,
  fontFamily: "inherit",
  background: "var(--ax-cyan-700)",
  color: "white",
  border: "none",
  borderRadius: "var(--r-md)",
  cursor: "pointer",
};

interface EditorFooterProps {
  onClear?: (() => void) | null;
  onApply: () => void;
  onRemove?: () => void;
  applyLabel?: string;
  applyDisabled?: boolean;
}

function EditorFooter({
  onClear,
  onApply,
  onRemove,
  applyLabel = "Apply",
  applyDisabled,
}: EditorFooterProps) {
  return (
    <>
      <div style={{ display: "flex", gap: 6 }}>
        {onClear && (
          <button type="button" onClick={onClear} style={btnGhost}>
            Clear
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            style={{ ...btnGhost, color: "var(--ax-negative)" }}
          >
            Remove
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onApply}
        disabled={applyDisabled}
        style={{
          ...btnPrimary,
          opacity: applyDisabled ? 0.5 : 1,
          cursor: applyDisabled ? "not-allowed" : "pointer",
        }}
      >
        {applyLabel}
      </button>
    </>
  );
}

// Enum editor

interface EnumEditorProps {
  def: FilterDef;
  value: unknown;
  onChange: (v: string[]) => void;
  onRemove?: () => void;
  onClose: () => void;
}

function EnumEditor({
  def,
  value,
  onChange,
  onRemove,
  onClose,
}: EnumEditorProps) {
  const initial = Array.isArray(value)
    ? (value as string[])
    : value
      ? [String(value)]
      : [];
  const [picked, setPicked] = useState<string[]>(initial);
  const [q, setQ] = useState("");

  const opts = useMemo(() => {
    if (!q) return def.options ?? [];
    return (def.options ?? []).filter((o) =>
      o.toLowerCase().includes(q.toLowerCase())
    );
  }, [q, def.options]);

  const toggle = (o: string) => {
    setPicked((p) => (p.includes(o) ? p.filter((x) => x !== o) : [...p, o]));
  };

  return (
    <EditorShell
      title={def.fullLabel}
      hint={`${picked.length} selected`}
      footer={
        <EditorFooter
          onClear={picked.length ? () => setPicked([]) : null}
          onRemove={onRemove}
          onApply={() => {
            onChange(picked);
            onClose();
          }}
          applyDisabled={picked.length === 0}
        />
      }
      width={300}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 8px",
          marginBottom: 8,
          background: "var(--ax-gray-25)",
          border: "1px solid var(--border-1)",
          borderRadius: "var(--r-md)",
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          style={{ color: "var(--fg-4)" }}
        >
          <circle
            cx="7"
            cy="7"
            r="4.75"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <path
            d="M10.5 10.5L13.5 13.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${def.label.toLowerCase()}…`}
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
      <div style={{ maxHeight: 240, overflowY: "auto", margin: "0 -4px" }}>
        {opts.length === 0 && (
          <div
            style={{
              padding: 16,
              textAlign: "center",
              color: "var(--fg-4)",
              fontSize: "var(--fs-13)",
            }}
          >
            No matches
          </div>
        )}
        {opts.map((o) => {
          const on = picked.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => toggle(o)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "6px 8px",
                borderRadius: "var(--r-sm)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: "var(--fs-13)",
                color: "var(--fg-1)",
                textAlign: "left",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--ax-gray-25)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 4,
                  flexShrink: 0,
                  background: on ? "var(--ax-cyan-700)" : "transparent",
                  border: on
                    ? "1px solid var(--ax-cyan-700)"
                    : "1px solid var(--ax-gray-300)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                }}
              >
                {on && (
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                    <path
                      d="M1.5 5L4 7.5L8.5 2.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <span style={{ flex: 1 }}>{o}</span>
            </button>
          );
        })}
      </div>
    </EditorShell>
  );
}

// Range editor

interface RangeValue {
  min?: number;
  max?: number;
}

interface RangeEditorProps {
  def: FilterDef;
  value: unknown;
  onChange: (v: RangeValue | null) => void;
  onRemove?: () => void;
  onClose: () => void;
}

function RangeEditor({
  def,
  value,
  onChange,
  onRemove,
  onClose,
}: RangeEditorProps) {
  const v = (value as RangeValue) || {};
  const [lo, setLo] = useState<string>(
    v.min !== undefined ? String(v.min) : ""
  );
  const [hi, setHi] = useState<string>(
    v.max !== undefined ? String(v.max) : ""
  );

  const applyPreset = ([, mn, mx]: [string, number, number]) => {
    setLo(String(mn));
    setHi(String(mx));
  };

  const defMin = def.min ?? 0;
  const defMax = def.max ?? 100;
  const span = defMax - defMin;
  const trackLo = lo === "" ? defMin : Math.max(defMin, Number(lo));
  const trackHi = hi === "" ? defMax : Math.min(defMax, Number(hi));
  const left = Math.max(0, ((trackLo - defMin) / span) * 100);
  const right = Math.min(100, ((trackHi - defMin) / span) * 100);

  const fmt = (n: number) => {
    const u = def.unit;
    if (u === "$m" && Math.abs(n) >= 1000)
      return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}b`;
    if (u === "$m") return `$${n}m`;
    if (u === "$k") return `$${n}k`;
    if (u === "%") return `${n}%`;
    if (u === "x") return `${n}x`;
    if (u === "yrs") return `${n}y`;
    return n.toLocaleString();
  };

  return (
    <EditorShell
      title={def.fullLabel}
      hint={def.unit ? `unit: ${def.unit}` : undefined}
      footer={
        <EditorFooter
          onClear={lo !== "" || hi !== "" ? () => { setLo(""); setHi(""); } : null}
          onRemove={onRemove}
          onApply={() => {
            const next: RangeValue = {};
            if (lo !== "") next.min = Number(lo);
            if (hi !== "") next.max = Number(hi);
            onChange(Object.keys(next).length ? next : null);
            onClose();
          }}
          applyDisabled={lo === "" && hi === ""}
        />
      }
      width={320}
    >
      {def.presets && (
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}
        >
          {def.presets.map((p) => {
            const active = lo === String(p[1]) && hi === String(p[2]);
            return (
              <button
                key={p[0]}
                type="button"
                onClick={() => applyPreset(p)}
                style={{
                  padding: "3px 9px",
                  fontSize: 11,
                  fontFamily: "inherit",
                  fontWeight: 600,
                  background: active
                    ? "var(--ax-cyan-50)"
                    : "var(--ax-gray-50)",
                  color: active ? "var(--ax-cyan-700)" : "var(--fg-2)",
                  border: `1px solid ${active ? "var(--ax-cyan-200)" : "var(--border-1)"}`,
                  borderRadius: 999,
                  cursor: "pointer",
                }}
              >
                {p[0]}
              </button>
            );
          })}
        </div>
      )}

      {/* Track preview */}
      <div
        style={{
          position: "relative",
          height: 6,
          background: "var(--ax-gray-100)",
          borderRadius: 3,
          margin: "14px 4px 6px",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${left}%`,
            right: `${100 - right}%`,
            background: "var(--ax-cyan-400)",
            borderRadius: 3,
          }}
        />
        {[left, right].map((pct, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: "50%",
              left: `${pct}%`,
              width: 10,
              height: 10,
              marginLeft: -5,
              marginTop: -5,
              borderRadius: "50%",
              background: "white",
              border: "2px solid var(--ax-cyan-700)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
            }}
          />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10,
          color: "var(--fg-4)",
          padding: "0 4px 10px",
        }}
      >
        <span>{fmt(defMin)}</span>
        <span>{fmt(defMax)}+</span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          gap: 6,
          alignItems: "center",
        }}
      >
        <NumberInput
          value={lo}
          onChange={setLo}
          placeholder="Min"
          unit={def.unit}
        />
        <span style={{ color: "var(--fg-4)", fontSize: "var(--fs-13)" }}>
          to
        </span>
        <NumberInput
          value={hi}
          onChange={setHi}
          placeholder="Max"
          unit={def.unit}
        />
      </div>
    </EditorShell>
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
  unit,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  unit?: string;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "6px 8px",
        background: "white",
        border: "1px solid var(--border-1)",
        borderRadius: "var(--r-md)",
      }}
    >
      {(unit === "$m" || unit === "$k") && (
        <span
          style={{
            color: "var(--fg-4)",
            fontSize: "var(--fs-13)",
            fontFamily: "var(--font-sans)",
          }}
        >
          $
        </span>
      )}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onWheel={(e) => e.currentTarget.blur()}
        style={{
          flex: 1,
          minWidth: 0,
          border: "none",
          outline: "none",
          fontFamily: "var(--font-sans)",
          fontVariantNumeric: "tabular-nums",
          fontSize: "var(--fs-13)",
          color: "var(--fg-1)",
        }}
      />
      {unit && unit !== "$m" && unit !== "$k" && (
        <span style={{ color: "var(--fg-4)", fontSize: 11 }}>{unit}</span>
      )}
      {unit === "$m" && (
        <span style={{ color: "var(--fg-4)", fontSize: 11 }}>m</span>
      )}
      {unit === "$k" && (
        <span style={{ color: "var(--fg-4)", fontSize: 11 }}>k</span>
      )}
    </label>
  );
}

// Segmented editor

interface SegmentedEditorProps {
  def: FilterDef;
  value: unknown;
  onChange: (v: string) => void;
  onRemove?: () => void;
  onClose: () => void;
}

function SegmentedEditor({
  def,
  value,
  onChange,
  onRemove,
  onClose,
}: SegmentedEditorProps) {
  const opts = def.options ?? [];
  const [pick, setPick] = useState<string>(
    String(value ?? opts[opts.length - 1] ?? "")
  );
  return (
    <EditorShell
      title={def.fullLabel}
      footer={
        <EditorFooter
          onRemove={onRemove}
          onApply={() => {
            onChange(pick);
            onClose();
          }}
        />
      }
      width={280}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${opts.length}, 1fr)`,
          background: "var(--ax-gray-50)",
          border: "1px solid var(--border-1)",
          borderRadius: "var(--r-md)",
          padding: 2,
        }}
      >
        {opts.map((o) => {
          const on = pick === o;
          return (
            <button
              key={o}
              type="button"
              onClick={() => setPick(o)}
              style={{
                padding: "7px 10px",
                fontFamily: "inherit",
                fontSize: "var(--fs-13)",
                fontWeight: on ? 600 : 500,
                background: on ? "white" : "transparent",
                color: on ? "var(--fg-1)" : "var(--fg-2)",
                border: "none",
                borderRadius: 5,
                boxShadow: on
                  ? "0 1px 2px rgba(0,0,0,0.06), 0 0 0 1px var(--border-1)"
                  : "none",
                cursor: "pointer",
              }}
            >
              {o}
            </button>
          );
        })}
      </div>
    </EditorShell>
  );
}

// Boolean editor

interface BooleanEditorProps {
  def: FilterDef;
  value: unknown;
  onChange: (v: boolean) => void;
  onRemove?: () => void;
  onClose: () => void;
}

function BooleanEditor({
  def,
  value,
  onChange,
  onRemove,
  onClose,
}: BooleanEditorProps) {
  const [on, setOn] = useState<boolean>(value !== false);
  return (
    <EditorShell
      title={def.fullLabel}
      footer={
        <EditorFooter
          onRemove={onRemove}
          onApply={() => {
            onChange(on);
            onClose();
          }}
        />
      }
      width={260}
    >
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 10px",
          borderRadius: "var(--r-md)",
          background: "var(--ax-gray-25)",
          border: "1px solid var(--border-1)",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => setOn(e.target.checked)}
          style={{ width: 16, height: 16, accentColor: "var(--ax-cyan-700)" }}
        />
        <span style={{ fontSize: "var(--fs-13)", color: "var(--fg-1)" }}>
          {def.fullLabel}
        </span>
      </label>
    </EditorShell>
  );
}

// FilterEditor router

interface FilterEditorProps {
  def: FilterDef;
  value: unknown;
  onChange: (v: unknown) => void;
  onRemove: () => void;
  onClose: () => void;
}

function FilterEditor({
  def,
  value,
  onChange,
  onRemove,
  onClose,
}: FilterEditorProps) {
  if (def.editor === "enum")
    return (
      <EnumEditor
        def={def}
        value={value}
        onChange={onChange as (v: string[]) => void}
        onRemove={onRemove}
        onClose={onClose}
      />
    );
  if (def.editor === "range")
    return (
      <RangeEditor
        def={def}
        value={value}
        onChange={onChange as (v: RangeValue | null) => void}
        onRemove={onRemove}
        onClose={onClose}
      />
    );
  if (def.editor === "segmented")
    return (
      <SegmentedEditor
        def={def}
        value={value}
        onChange={onChange as (v: string) => void}
        onRemove={onRemove}
        onClose={onClose}
      />
    );
  if (def.editor === "boolean")
    return (
      <BooleanEditor
        def={def}
        value={value}
        onChange={onChange as (v: boolean) => void}
        onRemove={onRemove}
        onClose={onClose}
      />
    );
  return null;
}

// ── Main CompaniesFilterBar ────────────────────────────────────────────────

export function CompaniesFilterBar({
  filterDefs,
  filterCategories,
  state,
  onStateChange,
  totalCount,
}: CompaniesFilterBarProps) {
  const { filters, searchText } = state;

  const setFilters = useCallback(
    (updater: FilterItem[] | ((prev: FilterItem[]) => FilterItem[])) => {
      onStateChange((s) => ({
        ...s,
        filters: typeof updater === "function" ? updater(s.filters) : updater,
        viewId: null,
      }));
    },
    [onStateChange]
  );

  const [editing, setEditing] = useState<string | null>(null);
  const chipRefs = useRef<Record<string, React.RefObject<HTMLSpanElement>>>({});

  const usedIds = useMemo(() => new Set(filters.map((f) => f.id)), [filters]);
  const available = useMemo(
    () => filterDefs.filter((d) => !usedIds.has(d.id)),
    [filterDefs, usedIds]
  );

  const addFilter = useCallback(
    (def: FilterDef) => {
      let initial: unknown = null;
      if (def.editor === "enum") initial = null;
      else if (def.editor === "range" && def.presets?.length) {
        const p = def.presets[0];
        initial = { min: p[1], max: p[2] };
      } else if (def.editor === "segmented")
        initial = def.options?.[0] ?? null;
      else if (def.editor === "boolean") initial = true;
      setFilters((f) => [...f, { id: def.id, value: initial }]);
      setEditing(def.id);
    },
    [setFilters]
  );

  const updateFilter = useCallback(
    (id: string, value: unknown) => {
      setFilters((f) => f.map((x) => (x.id === id ? { ...x, value } : x)));
    },
    [setFilters]
  );

  const removeFilter = useCallback(
    (id: string) => {
      setFilters((f) => f.filter((x) => x.id !== id));
      setEditing((e) => (e === id ? null : e));
    },
    [setFilters]
  );

  const clearAll = useCallback(() => {
    setFilters([]);
    setEditing(null);
  }, [setFilters]);

  const editingFilter = filters.find((f) => f.id === editing);
  const editingDef = editingFilter
    ? filterDefs.find((d) => d.id === editingFilter.id)
    : null;

  return (
    <div className="cfb-root">
      <style>{FILTER_BAR_CSS}</style>
      <div
        style={{
          background: "white",
          border: "1px solid var(--border-1)",
          borderRadius: "var(--r-lg)",
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {/* Row 1: search + chips + add */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          {/* Search */}
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "0 10px",
              background: "var(--ax-gray-25)",
              border: "1px solid var(--border-1)",
              borderRadius: "var(--r-md)",
              minWidth: 220,
              maxWidth: 320,
              flex: "0 1 auto",
              height: 30,
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
              style={{ color: "var(--fg-4)", flexShrink: 0 }}
            >
              <circle
                cx="7"
                cy="7"
                r="4.75"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <path
                d="M10.5 10.5L13.5 13.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="text"
              value={searchText}
              onChange={(e) =>
                onStateChange((s) => ({ ...s, searchText: e.target.value }))
              }
              placeholder="Company name, ticker…"
              style={{
                flex: 1,
                minWidth: 0,
                border: "none",
                outline: "none",
                background: "transparent",
                fontFamily: "var(--font-sans)",
                fontSize: "var(--fs-13)",
                color: "var(--fg-1)",
                height: "100%",
              }}
            />
            {searchText && (
              <button
                type="button"
                onClick={() =>
                  onStateChange((s) => ({ ...s, searchText: "" }))
                }
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  color: "var(--fg-4)",
                  display: "inline-flex",
                }}
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M3 3l6 6M9 3l-6 6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </label>

          {/* Active filter chips */}
          {filters.map((f) => {
            const def = filterDefs.find((d) => d.id === f.id);
            if (!def) return null;
            if (!chipRefs.current[f.id])
              chipRefs.current[f.id] = { current: null } as React.RefObject<HTMLSpanElement>;
            return (
              <span key={f.id} ref={chipRefs.current[f.id]}>
                <Chip
                  def={def}
                  value={f.value}
                  chipStyle="cyan"
                  showIcon
                  onEdit={() => setEditing(f.id)}
                  onRemove={() => removeFilter(f.id)}
                />
              </span>
            );
          })}

          {/* Add filter button */}
          <AddFilterButton
            availableDefs={available}
            categories={filterCategories}
            onPick={addFilter}
          />
        </div>

        {/* Row 2: status bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            paddingTop: 8,
            borderTop: "1px dashed var(--ax-gray-100)",
          }}
        >
          {filters.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              style={{
                padding: "4px 8px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: "var(--fs-13)",
                fontWeight: 500,
                color: "var(--fg-3)",
              }}
            >
              Reset filters
            </button>
          )}
          <span style={{ flex: 1 }} />
          <span
            style={{
              fontSize: "var(--fs-12)",
              color: "var(--fg-3)",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {filters.length > 0 && (
              <>
                <strong
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 6px",
                    background: "var(--ax-cyan-50)",
                    color: "var(--ax-cyan-700)",
                    borderRadius: 4,
                    fontSize: 10.5,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {filters.length} filter{filters.length === 1 ? "" : "s"} active
                </strong>
                <span>·</span>
              </>
            )}
            {totalCount != null && (
              <span>
                <strong
                  className="ax-numeric"
                  style={{ color: "var(--fg-1)", fontWeight: 700 }}
                >
                  {totalCount.toLocaleString()}
                </strong>
                <span> companies</span>
              </span>
            )}
          </span>
        </div>

        {/* Editor popover */}
        {editing &&
          editingDef &&
          editingFilter &&
          chipRefs.current[editing]?.current && (
            <Pop
              anchorRef={
                chipRefs.current[editing] as React.RefObject<HTMLElement>
              }
              onDismiss={() => setEditing(null)}
            >
              <FilterEditor
                def={editingDef}
                value={editingFilter.value}
                onChange={(v) => updateFilter(editing, v)}
                onRemove={() => removeFilter(editing)}
                onClose={() => setEditing(null)}
              />
            </Pop>
          )}
      </div>
    </div>
  );
}
