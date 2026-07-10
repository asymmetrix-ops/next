"use client";

import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
} from "react";
import {
  DEFAULT_YES_NO_DUAL_VALUE,
  normalizeYesNoDualFilterValue,
  summarizeYesNoDualFilter,
  type YesNoDualFilterValue,
} from "@/lib/yesNoDualFilter";

// ── Types ──────────────────────────────────────────────────────────────────

export interface FilterCategory {
  id: string;
  name: string;
}

export type FilterEditorType =
  | "enum"
  | "range"
  | "date_range"
  | "segmented"
  | "boolean"
  | "yes_no_dual";
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
  /** Filter type id (e.g. "country"). */
  id: string;
  /** Unique instance key — allows multiple filters of the same type. */
  key: string;
  value: unknown;
  /** How this filter combines with the previous one (ignored for the first filter). */
  combineLogic?: FilterCombineLogic;
}

let filterInstanceCounter = 0;

export function createFilterInstanceKey(): string {
  filterInstanceCounter += 1;
  return `filter-${filterInstanceCounter}-${Date.now()}`;
}

export type FilterCombineLogic = "and" | "or";

function getFilterEnumValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  if (typeof value === "string" && value.trim()) return [value];
  return [];
}

function isEmptyFilterValue(def: FilterDef, value: unknown): boolean {
  if (value == null) return true;
  if (def.editor === "enum") {
    return !Array.isArray(value) || value.length === 0;
  }
  if (def.editor === "range") {
    const v = value as { min?: number; max?: number };
    return v.min === undefined && v.max === undefined;
  }
  if (def.editor === "date_range") {
    const v = value as { from?: string; to?: string };
    return !v.from?.trim() && !v.to?.trim();
  }
  if (def.editor === "segmented") {
    return typeof value !== "string" || !value.trim();
  }
  if (def.editor === "boolean") {
    return value !== true;
  }
  if (def.editor === "yes_no_dual") {
    const v = normalizeYesNoDualFilterValue(value);
    return !v.yes && !v.no;
  }
  return false;
}

/** Values already chosen in other instances of the same filter type. */
function getValuesReservedBySiblingFilters(
  filters: FilterItem[],
  filterId: string,
  excludeInstanceKey: string
): Set<string> {
  const reserved = new Set<string>();
  for (const filter of filters) {
    if (filter.id !== filterId || filter.key === excludeInstanceKey) continue;
    for (const value of getFilterEnumValues(filter.value)) {
      reserved.add(value);
    }
  }
  return reserved;
}

function filterDefHasAvailableOptions(def: FilterDef, filters: FilterItem[]): boolean {
  if (def.editor === "boolean" || def.editor === "yes_no_dual") {
    return !filters.some((filter) => filter.id === def.id);
  }

  const siblingFilters = filters.filter((filter) => filter.id === def.id);
  if (siblingFilters.length === 0) return true;

  if (
    siblingFilters.some((filter) => isEmptyFilterValue(def, filter.value))
  ) {
    return false;
  }

  if (def.editor === "enum") {
    const options = def.options ?? [];
    if (options.length === 0) return true;
    const used = new Set<string>();
    for (const filter of siblingFilters) {
      for (const value of getFilterEnumValues(filter.value)) {
        used.add(value);
      }
    }
    return options.some((option) => !used.has(option));
  }

  if (def.editor === "segmented") {
    const options = def.options ?? [];
    if (options.length === 0) return true;
    const used = new Set(
      siblingFilters
        .map((filter) =>
          typeof filter.value === "string" ? filter.value : null
        )
        .filter((value): value is string => Boolean(value))
    );
    return options.some((option) => !used.has(option));
  }

  // Range filters may overlap intentionally (OR widens, AND narrows).
  return true;
}

export interface FilterBarState {
  filters: FilterItem[];
  viewId: string | null;
  searchText: string;
  /** Default combine logic for newly added filters (after the first). */
  filterLogic: FilterCombineLogic;
}

function describeActiveFilterLogic(
  filters: FilterItem[],
  defaultLogic: FilterCombineLogic
): string {
  if (filters.length <= 1) return defaultLogic;
  const logics = filters.slice(1).map((f) => f.combineLogic ?? defaultLogic);
  const first = logics[0];
  return logics.every((logic) => logic === first) ? first : "mixed";
}

export interface CompaniesFilterBarProps {
  filterDefs: FilterDef[];
  filterCategories: FilterCategory[];
  state: FilterBarState;
  onStateChange: (
    updater: FilterBarState | ((prev: FilterBarState) => FilterBarState)
  ) => void;
  totalCount?: number;
  entityLabel?: string;
  portfolioOnlyChipLabel?: string;
  portfolioBooleanDescription?: string;
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
  /** Clicks inside this node won't dismiss the popover. */
  boundaryRef?: React.RefObject<HTMLElement | null>;
}

function Pop({
  anchorRef,
  onDismiss,
  children,
  offset = 8,
  align = "start",
  boundaryRef,
}: PopProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
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
      if (boundaryRef?.current?.contains(e.target as Node)) return;
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
  }, [onDismiss, anchorRef, boundaryRef]);

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        top: pos?.top ?? 0,
        left: pos?.left ?? 0,
        visibility: pos ? "visible" : "hidden",
        zIndex: 9999,
      }}
    >
      {children}
    </div>
  );
}

// ── Summarize filter value ──────────────────────────────────────────────────

/** Treat sentinel / huge upper bounds as "no limit" (e.g. ≥ presets). */
function isUnboundedMax(max: number | undefined): boolean {
  if (max === undefined) return false;
  return max >= 1e15 || max === Number.MAX_SAFE_INTEGER;
}

function formatRangeValue(
  v: { min?: number; max?: number } | null | undefined,
  unit?: string,
  type?: string
): string {
  if (!v) return "";
  const isYear = type === "date";
  const fmt = (n: number) => {
    if (unit === "$m" && Math.abs(n) >= 1000)
      return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}b`;
    if (unit === "$m") return `$${n}m`;
    if (unit === "$k") return `$${n}k`;
    if (unit === "%") return `${n}%`;
    if (unit === "x") return `${n}x`;
    if (unit === "yrs") return `${n}y`;
    if (isYear) return String(n);
    return n.toLocaleString();
  };
  if (v.min !== undefined && v.max !== undefined) {
    if (isUnboundedMax(v.max)) {
      return `${fmt(v.min)} – no limit`;
    }
    return `${fmt(v.min)} – ${fmt(v.max)}`;
  }
  if (v.min !== undefined) return `≥ ${fmt(v.min)}`;
  if (v.max !== undefined) return `≤ ${fmt(v.max)}`;
  return "";
}

function summarize(
  def: FilterDef,
  value: unknown,
  portfolioOnlyChipLabel = "My Portfolio only"
): string {
  if (value == null) return "";
  if (def.editor === "enum") {
    if (!Array.isArray(value) || value.length === 0) return "";
    if (value.length === 1) return String(value[0]);
    return `${String(value[0])} +${value.length - 1}`;
  }
  if (def.editor === "range")
    return formatRangeValue(
      value as { min?: number; max?: number },
      def.unit,
      def.type
    );
  if (def.editor === "date_range") {
    const v = value as { from?: string; to?: string };
    const fmt = (raw: string) => {
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) return raw;
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    };
    if (v.from?.trim() && v.to?.trim()) {
      return `${fmt(v.from.trim())} – ${fmt(v.to.trim())}`;
    }
    if (v.from?.trim()) return `From ${fmt(v.from.trim())}`;
    if (v.to?.trim()) return `Until ${fmt(v.to.trim())}`;
    return "";
  }
  if (def.editor === "segmented") return String(value);
  if (def.editor === "boolean") {
    if (value !== true) return "";
    if (def.id === "followed") return portfolioOnlyChipLabel;
    return "On";
  }
  if (def.editor === "yes_no_dual") {
    return summarizeYesNoDualFilter(value);
  }
  return "";
}

// ── Chip ───────────────────────────────────────────────────────────────────

interface ChipProps {
  def: FilterDef;
  value: unknown;
  chipStyle?: "cyan" | "neutral" | "outlined";
  onEdit: () => void;
  onRemove: () => void;
  portfolioOnlyChipLabel?: string;
}

function Chip({
  def,
  value,
  chipStyle = "neutral",
  onEdit,
  onRemove,
  portfolioOnlyChipLabel,
}: ChipProps) {
  const [hover, setHover] = useState(false);
  const summary = summarize(def, value, portfolioOnlyChipLabel);

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
        : def.editor === "date_range"
          ? "date range"
          : def.editor === "segmented"
            ? "choice"
            : def.editor === "boolean"
              ? "toggle"
              : def.editor === "yes_no_dual"
                ? "Yes / No"
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

function getInitialFilterValue(def: FilterDef): unknown {
  if (def.editor === "enum") return null;
  if (def.editor === "date_range") return null;
  if (def.editor === "range" && def.presets?.length) {
    const p = def.presets[0];
    return { min: p[1], max: p[2] };
  }
  if (def.editor === "segmented") return def.options?.[0] ?? null;
  if (def.editor === "boolean") return true;
  if (def.editor === "yes_no_dual") return DEFAULT_YES_NO_DUAL_VALUE;
  return null;
}

interface AddFilterPickerProps {
  availableDefs: FilterDef[];
  categories: FilterCategory[];
  filters: FilterItem[];
  onApply: (def: FilterDef, value: unknown) => void;
  onClose: () => void;
}

function FilterPanelCloseButton({
  onClick,
  label = "Close",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
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
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--ax-gray-50)";
        e.currentTarget.style.color = "var(--fg-2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--fg-4)";
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
  );
}

function AddFilterPicker({
  availableDefs,
  categories,
  filters,
  onApply,
  onClose,
}: AddFilterPickerProps) {
  const [activeDef, setActiveDef] = useState<FilterDef | null>(null);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!activeDef) inputRef.current?.focus();
  }, [activeDef]);

  const activeReservedValues = useMemo(() => {
    if (!activeDef) return new Set<string>();
    return getValuesReservedBySiblingFilters(filters, activeDef.id, "");
  }, [filters, activeDef]);

  const activeInitialValue = useMemo(
    () => (activeDef ? getInitialFilterValue(activeDef) : null),
    [activeDef]
  );

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

  const handleClose = useCallback(() => {
    setActiveDef(null);
    onClose();
  }, [onClose]);

  if (activeDef) {
    return (
      <FilterEditor
        key={activeDef.id}
        def={activeDef}
        value={activeInitialValue}
        reservedValues={activeReservedValues}
        onChange={(value) => onApply(activeDef, value)}
        onClose={() => setActiveDef(null)}
        onBack={() => setActiveDef(null)}
        onDismiss={handleClose}
      />
    );
  }

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
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
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
            Add filter
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
            }}
          >
            <div
              style={{ fontSize: 11, color: "var(--fg-4)" }}
              className="ax-numeric"
            >
              {availableDefs.length} available
            </div>
            <FilterPanelCloseButton onClick={handleClose} />
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
                    onPick={() => setActiveDef(d)}
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
          <kbd style={kbdStyle}>↑↓</kbd> navigate · <kbd style={kbdStyle}>↵</kbd> select
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
  filters: FilterItem[];
  onApply: (def: FilterDef, value: unknown) => void;
  boundaryRef?: React.RefObject<HTMLElement | null>;
}

function AddFilterButton({
  availableDefs,
  categories,
  filters,
  onApply,
  boundaryRef,
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
          boundaryRef={boundaryRef}
          onDismiss={() => setOpen(false)}
        >
          <AddFilterPicker
            availableDefs={availableDefs}
            categories={categories}
            filters={filters}
            onApply={onApply}
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
  compact?: boolean;
  onDismiss?: () => void;
}

function EditorShell({
  title,
  hint,
  footer,
  children,
  width = 320,
  compact = false,
  onDismiss,
}: EditorShellProps) {
  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
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
          padding: compact ? "8px 12px 6px" : "10px 14px 8px",
          borderBottom: "1px solid var(--ax-gray-100)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div
          style={{
            fontSize: compact ? "var(--fs-12)" : "var(--fs-13)",
            fontWeight: 700,
            color: "var(--fg-1)",
            minWidth: 0,
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
            marginLeft: "auto",
          }}
        >
          {hint && (
            <div style={{ fontSize: 10, color: "var(--fg-4)" }}>{hint}</div>
          )}
          {onDismiss && <FilterPanelCloseButton onClick={onDismiss} />}
        </div>
      </div>
      <div style={{ padding: compact ? "8px 12px 10px" : "10px 14px 12px" }}>
        {children}
      </div>
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
  onBack?: () => void;
  applyLabel?: string;
  applyDisabled?: boolean;
}

function EditorFooter({
  onClear,
  onApply,
  onRemove,
  onBack,
  applyLabel = "Apply",
  applyDisabled,
}: EditorFooterProps) {
  return (
    <>
      <div style={{ display: "flex", gap: 6 }}>
        {onBack && (
          <button type="button" onClick={onBack} style={btnGhost}>
            Back
          </button>
        )}
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
  reservedValues?: Set<string>;
  onChange: (v: string[]) => void;
  onRemove?: () => void;
  onBack?: () => void;
  onDismiss?: () => void;
  onClose: () => void;
}

function EnumEditor({
  def,
  value,
  reservedValues,
  onChange,
  onRemove,
  onBack,
  onDismiss,
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
    const reserved = reservedValues?.has(o) && !picked.includes(o);
    if (reserved) return;
    setPicked((p) => (p.includes(o) ? p.filter((x) => x !== o) : [...p, o]));
  };

  return (
    <EditorShell
      title={def.fullLabel}
      hint={`${picked.length} selected`}
      onDismiss={onDismiss}
      footer={
        <EditorFooter
          onClear={picked.length ? () => setPicked([]) : null}
          onRemove={onRemove}
          onBack={onBack}
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
          const reserved = Boolean(reservedValues?.has(o) && !on);
          return (
            <button
              key={o}
              type="button"
              onClick={() => toggle(o)}
              disabled={reserved}
              title={
                reserved
                  ? "Already used in another filter of this type"
                  : undefined
              }
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "6px 8px",
                borderRadius: "var(--r-sm)",
                background: "transparent",
                border: "none",
                cursor: reserved ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                fontSize: "var(--fs-13)",
                color: reserved ? "var(--fg-4)" : "var(--fg-1)",
                textAlign: "left",
                opacity: reserved ? 0.55 : 1,
              }}
              onMouseEnter={(e) => {
                if (!reserved) {
                  e.currentTarget.style.background = "var(--ax-gray-25)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
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
  onBack?: () => void;
  onDismiss?: () => void;
  onClose: () => void;
}

function RangeEditor({
  def,
  value,
  onChange,
  onRemove,
  onBack,
  onDismiss,
  onClose,
}: RangeEditorProps) {
  const v = (value as RangeValue) || {};
  const [lo, setLo] = useState<string>(
    v.min !== undefined ? String(v.min) : ""
  );
  const [hi, setHi] = useState<string>(
    v.max !== undefined && !isUnboundedMax(v.max) ? String(v.max) : ""
  );

  const applyPreset = ([, mn, mx]: [string, number, number]) => {
    setLo(String(mn));
    setHi(isUnboundedMax(mx) ? "" : String(mx));
  };

  const defMin = def.min ?? 0;
  const defMax = def.max ?? 100;
  const isYearRange = def.type === "date";
  const shellWidth = isYearRange ? 268 : 248;

  const fmt = (n: number) => {
    const u = def.unit;
    if (u === "$m" && Math.abs(n) >= 1000)
      return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}b`;
    if (u === "$m") return `$${n}m`;
    if (u === "$k") return `$${n}k`;
    if (u === "%") return `${n}%`;
    if (u === "x") return `${n}x`;
    if (u === "yrs") return `${n}y`;
    // Years should never be formatted with thousand-separators
    if (isYearRange) return String(n);
    return n.toLocaleString();
  };

  return (
    <EditorShell
      title={def.fullLabel}
      hint={def.unit ? `unit: ${def.unit}` : undefined}
      compact
      onDismiss={onDismiss}
      footer={
        <EditorFooter
          onClear={lo !== "" || hi !== "" ? () => { setLo(""); setHi(""); } : null}
          onRemove={onRemove}
          onBack={onBack}
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
      width={shellWidth}
    >
      {def.presets && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 3,
            marginBottom: 8,
          }}
        >
          {def.presets.map((p) => {
            const active =
              lo === String(p[1]) &&
              (isUnboundedMax(p[2]) ? hi === "" : hi === String(p[2]));
            return (
              <button
                key={p[0]}
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => applyPreset(p)}
                style={{
                  padding: "2px 7px",
                  fontSize: 10,
                  fontFamily: "inherit",
                  fontWeight: 600,
                  lineHeight: 1.4,
                  background: active
                    ? "var(--ax-cyan-50)"
                    : "var(--ax-gray-50)",
                  color: active ? "var(--ax-cyan-700)" : "var(--fg-2)",
                  border: `1px solid ${active ? "var(--ax-cyan-200)" : "var(--border-1)"}`,
                  borderRadius: 999,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {p[0]}
              </button>
            );
          })}
        </div>
      )}

      {!isYearRange && def.unit && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 9,
            color: "var(--fg-4)",
            marginBottom: 6,
            padding: "0 2px",
          }}
        >
          <span>{fmt(defMin)}</span>
          <span>{fmt(defMax)}+</span>
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        <NumberInput
          value={lo}
          onChange={setLo}
          placeholder="Min"
          unit={def.unit}
          compact
        />
        <span
          style={{
            color: "var(--fg-4)",
            fontSize: "var(--fs-12)",
            flexShrink: 0,
          }}
        >
          to
        </span>
        <NumberInput
          value={hi}
          onChange={setHi}
          placeholder={lo !== "" ? "No limit" : "Max"}
          unit={def.unit}
          compact
        />
      </div>
    </EditorShell>
  );
}

interface DateRangeValue {
  from?: string;
  to?: string;
}

interface DateRangeEditorProps {
  def: FilterDef;
  value: unknown;
  onChange: (v: DateRangeValue | null) => void;
  onRemove?: () => void;
  onBack?: () => void;
  onDismiss?: () => void;
  onClose: () => void;
}

function DateRangeEditor({
  def,
  value,
  onChange,
  onRemove,
  onBack,
  onDismiss,
  onClose,
}: DateRangeEditorProps) {
  const v = (value as DateRangeValue) || {};
  const [from, setFrom] = useState(v.from ?? "");
  const [to, setTo] = useState(v.to ?? "");

  return (
    <EditorShell
      title={def.fullLabel}
      hint="Leave blank for open start/end"
      compact
      onDismiss={onDismiss}
      footer={
        <EditorFooter
          onClear={
            from !== "" || to !== ""
              ? () => {
                  setFrom("");
                  setTo("");
                }
              : null
          }
          onRemove={onRemove}
          onBack={onBack}
          onApply={() => {
            const next: DateRangeValue = {};
            if (from.trim()) next.from = from.trim();
            if (to.trim()) next.to = to.trim();
            onChange(Object.keys(next).length ? next : null);
            onClose();
          }}
          applyDisabled={from.trim() === "" && to.trim() === ""}
        />
      }
      width={288}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            flex: 1,
            padding: "4px 6px",
            background: "white",
            border: "1px solid var(--border-1)",
            borderRadius: "var(--r-md)",
          }}
        >
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            aria-label="From date"
            style={{
              flex: 1,
              minWidth: 0,
              border: "none",
              outline: "none",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--fs-12)",
              color: "var(--fg-1)",
            }}
          />
        </label>
        <span
          style={{
            color: "var(--fg-4)",
            fontSize: "var(--fs-12)",
            flexShrink: 0,
          }}
        >
          to
        </span>
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            flex: 1,
            padding: "4px 6px",
            background: "white",
            border: "1px solid var(--border-1)",
            borderRadius: "var(--r-md)",
          }}
        >
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            aria-label="To date"
            style={{
              flex: 1,
              minWidth: 0,
              border: "none",
              outline: "none",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--fs-12)",
              color: "var(--fg-1)",
            }}
          />
        </label>
      </div>
    </EditorShell>
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
  unit,
  compact = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  unit?: string;
  compact?: boolean;
}) {
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        width: compact ? 76 : undefined,
        flex: compact ? "0 0 76px" : 1,
        padding: compact ? "4px 6px" : "6px 8px",
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
          width: compact ? 36 : undefined,
          minWidth: 0,
          border: "none",
          outline: "none",
          fontFamily: "var(--font-sans)",
          fontVariantNumeric: "tabular-nums",
          fontSize: compact ? "var(--fs-12)" : "var(--fs-13)",
          color: "var(--fg-1)",
        }}
      />
      {unit && unit !== "$m" && unit !== "$k" && (
        <span style={{ color: "var(--fg-4)", fontSize: compact ? 10 : 11 }}>
          {unit}
        </span>
      )}
      {unit === "$m" && (
        <span style={{ color: "var(--fg-4)", fontSize: compact ? 10 : 11 }}>m</span>
      )}
      {unit === "$k" && (
        <span style={{ color: "var(--fg-4)", fontSize: compact ? 10 : 11 }}>k</span>
      )}
    </label>
  );
}

// Segmented editor

interface SegmentedEditorProps {
  def: FilterDef;
  value: unknown;
  reservedValues?: Set<string>;
  onChange: (v: string) => void;
  onRemove?: () => void;
  onBack?: () => void;
  onDismiss?: () => void;
  onClose: () => void;
}

function SegmentedEditor({
  def,
  value,
  reservedValues,
  onChange,
  onRemove,
  onBack,
  onDismiss,
  onClose,
}: SegmentedEditorProps) {
  const opts = def.options ?? [];
  const firstAvailable =
    opts.find((option) => !reservedValues?.has(option)) ?? opts[0] ?? "";
  const [pick, setPick] = useState<string>(
    String(value ?? firstAvailable)
  );
  return (
    <EditorShell
      title={def.fullLabel}
      onDismiss={onDismiss}
      footer={
        <EditorFooter
          onRemove={onRemove}
          onBack={onBack}
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
          const reserved = Boolean(reservedValues?.has(o) && !on);
          return (
            <button
              key={o}
              type="button"
              onClick={() => {
                if (!reserved) setPick(o);
              }}
              disabled={reserved}
              title={
                reserved
                  ? "Already used in another filter of this type"
                  : undefined
              }
              style={{
                padding: "7px 10px",
                fontFamily: "inherit",
                fontSize: "var(--fs-13)",
                fontWeight: on ? 600 : 500,
                background: on ? "white" : "transparent",
                color: reserved ? "var(--fg-4)" : on ? "var(--fg-1)" : "var(--fg-2)",
                border: "none",
                borderRadius: 5,
                boxShadow: on
                  ? "0 1px 2px rgba(0,0,0,0.06), 0 0 0 1px var(--border-1)"
                  : "none",
                cursor: reserved ? "not-allowed" : "pointer",
                opacity: reserved ? 0.55 : 1,
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
  onBack?: () => void;
  onDismiss?: () => void;
  onClose: () => void;
  portfolioBooleanDescription?: string;
}

function BooleanEditor({
  def,
  value,
  onChange,
  onRemove,
  onBack,
  onDismiss,
  onClose,
  portfolioBooleanDescription,
}: BooleanEditorProps) {
  const [on, setOn] = useState<boolean>(value === true);
  const isPortfolioFilter = def.id === "followed";

  const handleApply = () => {
    if (on) {
      onChange(true);
      onClose();
      return;
    }
    // Unchecked: remove active filter (if any) and show all companies.
    if (onRemove) {
      onRemove();
    }
    onClose();
  };

  return (
    <EditorShell
      title={def.fullLabel}
      onDismiss={onDismiss}
      footer={
        <EditorFooter
          onRemove={onRemove}
          onBack={onBack}
          onApply={handleApply}
        />
      }
      width={300}
    >
      <label
        style={{
          display: "flex",
          alignItems: "flex-start",
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
          style={{
            width: 16,
            height: 16,
            marginTop: 2,
            accentColor: "var(--ax-cyan-700)",
          }}
        />
        <span style={{ fontSize: "var(--fs-13)", color: "var(--fg-1)", lineHeight: 1.45 }}>
          {isPortfolioFilter
            ? portfolioBooleanDescription ||
              "Show only My Portfolio companies (followed or on a list)"
            : def.fullLabel}
        </span>
      </label>
      {isPortfolioFilter && (
        <p
          style={{
            margin: "8px 0 0",
            fontSize: "var(--fs-12)",
            color: "var(--fg-4)",
            lineHeight: 1.45,
          }}
        >
          Uncheck and apply to show all companies, or remove the filter chip.
        </p>
      )}
    </EditorShell>
  );
}

// Yes / No dual-checkbox editor (at least one must remain checked)

interface YesNoDualEditorProps {
  def: FilterDef;
  value: unknown;
  onChange: (v: YesNoDualFilterValue) => void;
  onRemove?: () => void;
  onBack?: () => void;
  onDismiss?: () => void;
  onClose: () => void;
}

function YesNoDualEditor({
  def,
  value,
  onChange,
  onRemove,
  onBack,
  onDismiss,
  onClose,
}: YesNoDualEditorProps) {
  const initial = normalizeYesNoDualFilterValue(value);
  const [yes, setYes] = useState(initial.yes);
  const [no, setNo] = useState(initial.no);

  const toggleYes = (checked: boolean) => {
    if (!checked && !no) return;
    setYes(checked);
  };

  const toggleNo = (checked: boolean) => {
    if (!checked && !yes) return;
    setNo(checked);
  };

  const handleApply = () => {
    onChange({ yes, no });
    onClose();
  };

  const checkboxRow = (label: string, checked: boolean, onToggle: (next: boolean) => void) => (
    <label
      style={{
        display: "flex",
        alignItems: "flex-start",
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
        checked={checked}
        onChange={(e) => onToggle(e.target.checked)}
        style={{
          width: 16,
          height: 16,
          marginTop: 2,
          accentColor: "var(--ax-cyan-700)",
        }}
      />
      <span style={{ fontSize: "var(--fs-13)", color: "var(--fg-1)", lineHeight: 1.45 }}>
        {label}
      </span>
    </label>
  );

  return (
    <EditorShell
      title={def.fullLabel}
      onDismiss={onDismiss}
      footer={
        <EditorFooter
          onRemove={onRemove}
          onBack={onBack}
          onApply={handleApply}
        />
      }
      width={300}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {checkboxRow("Yes", yes, toggleYes)}
        {checkboxRow("No", no, toggleNo)}
      </div>
      <p
        style={{
          margin: "8px 0 0",
          fontSize: "var(--fs-12)",
          color: "var(--fg-4)",
          lineHeight: 1.45,
        }}
      >
        Select both to show all companies. At least one option must stay checked.
      </p>
    </EditorShell>
  );
}

// FilterEditor router

interface FilterEditorProps {
  def: FilterDef;
  value: unknown;
  reservedValues?: Set<string>;
  onChange: (v: unknown) => void;
  onClose: () => void;
  onRemove?: () => void;
  onBack?: () => void;
  onDismiss?: () => void;
  portfolioBooleanDescription?: string;
}

function FilterEditor({
  def,
  value,
  reservedValues,
  onChange,
  onRemove,
  onBack,
  onDismiss,
  onClose,
  portfolioBooleanDescription,
}: FilterEditorProps) {
  if (def.editor === "enum")
    return (
      <EnumEditor
        def={def}
        value={value}
        reservedValues={reservedValues}
        onChange={onChange as (v: string[]) => void}
        onRemove={onRemove}
        onBack={onBack}
        onDismiss={onDismiss}
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
        onBack={onBack}
        onDismiss={onDismiss}
        onClose={onClose}
      />
    );
  if (def.editor === "date_range")
    return (
      <DateRangeEditor
        def={def}
        value={value}
        onChange={onChange as (v: DateRangeValue | null) => void}
        onRemove={onRemove}
        onBack={onBack}
        onDismiss={onDismiss}
        onClose={onClose}
      />
    );
  if (def.editor === "segmented")
    return (
      <SegmentedEditor
        def={def}
        value={value}
        reservedValues={reservedValues}
        onChange={onChange as (v: string) => void}
        onRemove={onRemove}
        onBack={onBack}
        onDismiss={onDismiss}
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
        onBack={onBack}
        onDismiss={onDismiss}
        onClose={onClose}
        portfolioBooleanDescription={portfolioBooleanDescription}
      />
    );
  if (def.editor === "yes_no_dual")
    return (
      <YesNoDualEditor
        def={def}
        value={value}
        onChange={onChange}
        onRemove={onRemove}
        onBack={onBack}
        onDismiss={onDismiss}
        onClose={onClose}
      />
    );
  return null;
}

// ── Filter logic toggle (AND / OR) ─────────────────────────────────────────

function FilterLogicToggle({
  value,
  onChange,
}: {
  value: FilterCombineLogic;
  onChange: (v: FilterCombineLogic) => void;
}) {
  const options: { id: FilterCombineLogic; label: string; title: string }[] = [
    {
      id: "and",
      label: "AND",
      title: "Next filter will combine with AND",
    },
    {
      id: "or",
      label: "OR",
      title: "Next filter will combine with OR",
    },
  ];

  return (
    <div
      role="group"
      aria-label="Default filter combination for new filters"
      title="Default AND/OR when adding another filter"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--fg-4)",
          letterSpacing: "0.02em",
          whiteSpace: "nowrap",
        }}
      >
        Match
      </span>
      <div
        style={{
          display: "inline-flex",
          background: "var(--ax-gray-50)",
          border: "1px solid var(--border-1)",
          borderRadius: "var(--r-md)",
          padding: 2,
          height: 30,
        }}
      >
        {options.map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              title={opt.title}
              aria-pressed={active}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => {
                if (!active) onChange(opt.id);
              }}
              style={{
                padding: "0 10px",
                fontFamily: "inherit",
                fontSize: 11,
                fontWeight: active ? 700 : 600,
                letterSpacing: "0.04em",
                background: active ? "white" : "transparent",
                color: active ? "var(--ax-cyan-700)" : "var(--fg-3)",
                border: "none",
                borderRadius: 4,
                boxShadow: active
                  ? "0 1px 2px rgba(0,0,0,0.06), 0 0 0 1px var(--border-1)"
                  : "none",
                cursor: "pointer",
                height: "100%",
                transition: "color 120ms, background 120ms",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FilterLogicSeparator({
  logic,
  onToggle,
}: {
  logic: FilterCombineLogic;
  onToggle?: () => void;
}) {
  const label = logic.toUpperCase();
  const style: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 28,
    padding: "0 2px",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.06em",
    color: "var(--fg-4)",
    userSelect: "none",
  };

  if (!onToggle) {
    return (
      <span aria-hidden="true" style={style}>
        {label}
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-label={`Switch to ${logic === "and" ? "OR" : "AND"} between filters`}
      title={`Combine with ${logic === "and" ? "OR" : "AND"} — click to switch`}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={onToggle}
      style={{
        ...style,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        borderRadius: 4,
        transition: "color 120ms, background 120ms",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--ax-cyan-700)";
        e.currentTarget.style.background = "var(--ax-cyan-50)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "var(--fg-4)";
        e.currentTarget.style.background = "transparent";
      }}
    >
      {label}
    </button>
  );
}

// ── Main CompaniesFilterBar ────────────────────────────────────────────────

export function CompaniesFilterBar({
  filterDefs,
  filterCategories,
  state,
  onStateChange,
  totalCount,
  entityLabel = "companies",
  portfolioOnlyChipLabel = "My Portfolio only",
  portfolioBooleanDescription,
}: CompaniesFilterBarProps) {
  const { filters, searchText, filterLogic } = state;

  const setFilterLogic = useCallback(
    (next: FilterCombineLogic) => {
      onStateChange((s) => ({ ...s, filterLogic: next, viewId: null }));
    },
    [onStateChange]
  );

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

  const toggleFilterCombineLogic = useCallback(
    (filterIndex: number) => {
      if (filterIndex <= 0) return;
      setFilters((prev) =>
        prev.map((f, i) => {
          if (i !== filterIndex) return f;
          const current = f.combineLogic ?? filterLogic;
          return { ...f, combineLogic: current === "and" ? "or" : "and" };
        })
      );
    },
    [setFilters, filterLogic]
  );

  const [editing, setEditing] = useState<string | null>(null);
  const chipRefs = useRef<Record<string, React.RefObject<HTMLSpanElement>>>({});
  const filterBarRef = useRef<HTMLDivElement>(null);

  const commitFilter = useCallback(
    (def: FilterDef, value: unknown) => {
      if (isEmptyFilterValue(def, value)) return;
      const instanceKey = createFilterInstanceKey();
      onStateChange((s) => ({
        ...s,
        viewId: null,
        filters: [
          ...s.filters,
          {
            id: def.id,
            key: instanceKey,
            value,
            ...(s.filters.length > 0 ? { combineLogic: s.filterLogic } : {}),
          },
        ],
      }));
    },
    [onStateChange]
  );

  const updateFilter = useCallback(
    (instanceKey: string, value: unknown) => {
      const existing = filters.find((x) => x.key === instanceKey);
      const def = existing
        ? filterDefs.find((d) => d.id === existing.id)
        : undefined;
      if (
        def?.editor === "boolean" &&
        value !== true
      ) {
        setFilters((f) => f.filter((x) => x.key !== instanceKey));
        setEditing((e) => (e === instanceKey ? null : e));
        return;
      }
      setFilters((f) =>
        f.map((x) => (x.key === instanceKey ? { ...x, value } : x))
      );
    },
    [setFilters, filters, filterDefs]
  );

  const removeFilter = useCallback(
    (instanceKey: string) => {
      setFilters((f) => f.filter((x) => x.key !== instanceKey));
      setEditing((e) => (e === instanceKey ? null : e));
    },
    [setFilters]
  );

  const clearAll = useCallback(() => {
    setFilters([]);
    setEditing(null);
  }, [setFilters]);

  const editingFilter = filters.find((f) => f.key === editing);
  const editingDef = editingFilter
    ? filterDefs.find((d) => d.id === editingFilter.id)
    : null;

  const availableFilterDefs = useMemo(
    () =>
      filterDefs.filter((def) =>
        filterDefHasAvailableOptions(def, filters)
      ),
    [filterDefs, filters]
  );

  const editingReservedValues = useMemo(() => {
    if (!editingFilter) return new Set<string>();
    return getValuesReservedBySiblingFilters(
      filters,
      editingFilter.id,
      editingFilter.key
    );
  }, [filters, editingFilter]);

  return (
    <div className="cfb-root" ref={filterBarRef}>
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
          {filters.map((f, index) => {
            const def = filterDefs.find((d) => d.id === f.id);
            if (!def) return null;
            if (!chipRefs.current[f.key])
              chipRefs.current[f.key] = { current: null } as React.RefObject<HTMLSpanElement>;
            return (
              <React.Fragment key={f.key}>
                {index > 0 && (
                  <FilterLogicSeparator
                    logic={f.combineLogic ?? filterLogic}
                    onToggle={() => toggleFilterCombineLogic(index)}
                  />
                )}
                <span ref={chipRefs.current[f.key]}>
                  <Chip
                    def={def}
                    value={f.value}
                    chipStyle="cyan"
                    onEdit={() => setEditing(f.key)}
                    onRemove={() => removeFilter(f.key)}
                    portfolioOnlyChipLabel={portfolioOnlyChipLabel}
                  />
                </span>
              </React.Fragment>
            );
          })}

          {filters.length > 0 && (
            <FilterLogicToggle
              value={filterLogic}
              onChange={setFilterLogic}
            />
          )}

          {/* Add filter button */}
          <AddFilterButton
            availableDefs={availableFilterDefs}
            categories={filterCategories}
            filters={filters}
            onApply={commitFilter}
            boundaryRef={filterBarRef}
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
                {filters.length > 0 && (
                  <>
                    <span>·</span>
                    <span style={{ textTransform: "uppercase", fontWeight: 600 }}>
                      {describeActiveFilterLogic(filters, filterLogic)} logic
                    </span>
                  </>
                )}
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
                <span> {entityLabel}</span>
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
              boundaryRef={filterBarRef}
              onDismiss={() => setEditing(null)}
            >
              <FilterEditor
                key={editing}
                def={editingDef}
                value={editingFilter.value}
                reservedValues={editingReservedValues}
                onChange={(v) => updateFilter(editing, v)}
                onRemove={() => removeFilter(editing)}
                onClose={() => setEditing(null)}
                portfolioBooleanDescription={portfolioBooleanDescription}
              />
            </Pop>
          )}
      </div>
    </div>
  );
}
