"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FilterDef } from "@/app/financials-tsx/types";
import { FILTER_POPOVER_SCROLL_STYLE } from "@/components/filters/AnchoredPopover";
import {
  CITY_FILTER_PAGE_SIZE,
  locationsService,
} from "@/lib/locationsService";

export interface IdFilterOption {
  id: number;
  name: string;
}

interface EditorShellProps {
  title: string;
  hint?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  width?: number;
  compact?: boolean;
  onDismiss?: () => void;
}

function FilterPanelCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Close"
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
          {hint && <div style={{ fontSize: 10, color: "var(--fg-4)" }}>{hint}</div>}
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

function EditorFooter({
  onClear,
  onApply,
  onRemove,
  onBack,
  applyLabel = "Apply",
  applyDisabled,
}: {
  onClear?: (() => void) | null;
  onApply: () => void;
  onRemove?: () => void;
  onBack?: () => void;
  applyLabel?: string;
  applyDisabled?: boolean;
}) {
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

function isUnboundedMax(max: number | undefined): boolean {
  if (max === undefined) return false;
  return max >= 999999 || max >= 1e15 || max === Number.MAX_SAFE_INTEGER;
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
        <span style={{ color: "var(--fg-4)", fontSize: "var(--fs-13)" }}>$</span>
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
        <span style={{ color: "var(--fg-4)", fontSize: compact ? 10 : 11 }}>{unit}</span>
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

export interface ListViewRangeEditorProps {
  def: FilterDef;
  value?: { min?: number; max?: number } | null;
  onApply: (value: { min?: number; max?: number } | null) => void;
  onBack?: () => void;
  onRemove?: () => void;
  onDismiss?: () => void;
}

export function ListViewRangeEditor({
  def,
  value,
  onApply,
  onBack,
  onRemove,
  onDismiss,
}: ListViewRangeEditorProps) {
  const v = value || {};
  const [lo, setLo] = useState(v.min !== undefined ? String(v.min) : "");
  const [hi, setHi] = useState(
    v.max !== undefined && !isUnboundedMax(v.max) ? String(v.max) : ""
  );

  useEffect(() => {
    setLo(v.min !== undefined ? String(v.min) : "");
    setHi(v.max !== undefined && !isUnboundedMax(v.max) ? String(v.max) : "");
  }, [v.min, v.max]);

  const applyPreset = ([, mn, mx]: [string, number, number]) => {
    setLo(String(mn));
    setHi(isUnboundedMax(mx) ? "" : String(mx));
  };

  const defMin = def.min ?? 0;
  const defMax = def.max ?? 100;

  const fmt = (n: number) => {
    const u = def.unit;
    if (u === "$m") {
      return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}m`;
    }
    if (u === "%") return `${n}%`;
    if (u === "x") return `${n}x`;
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
            const next: { min?: number; max?: number } = {};
            if (lo !== "") next.min = Number(lo);
            if (hi !== "") next.max = Number(hi);
            onApply(Object.keys(next).length ? next : null);
          }}
          applyDisabled={lo === "" && hi === ""}
        />
      }
      width={248}
    >
      {def.presets && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 8 }}>
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
                  background: active ? "var(--ax-cyan-50)" : "var(--ax-gray-50)",
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

      {def.unit && (
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
        <NumberInput value={lo} onChange={setLo} placeholder="Min" unit={def.unit} compact />
        <span style={{ color: "var(--fg-4)", fontSize: "var(--fs-12)", flexShrink: 0 }}>to</span>
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

export interface ListViewEnumEditorProps {
  def: FilterDef;
  options: string[];
  value?: string[];
  onApply: (values: string[]) => void;
  onBack?: () => void;
  onRemove?: () => void;
  onDismiss?: () => void;
}

export function ListViewEnumEditor({
  def,
  options,
  value = [],
  onApply,
  onBack,
  onRemove,
  onDismiss,
}: ListViewEnumEditorProps) {
  const [picked, setPicked] = useState<string[]>(value);
  const [q, setQ] = useState("");

  const opts = useMemo(() => {
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q.toLowerCase()));
  }, [q, options]);

  const toggle = (o: string) => {
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
          onApply={() => onApply(picked)}
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
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ color: "var(--fg-4)" }}>
          <circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.4" />
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
      <div style={{ maxHeight: 240, overflowY: "auto", margin: "0 -4px", ...FILTER_POPOVER_SCROLL_STYLE }}>
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
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--ax-gray-25)";
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

export interface ListViewIdEnumEditorProps {
  def: FilterDef;
  options: IdFilterOption[];
  value?: number[];
  onApply: (values: number[]) => void;
  onBack?: () => void;
  onRemove?: () => void;
  onDismiss?: () => void;
}

export function ListViewIdEnumEditor({
  def,
  options,
  value = [],
  onApply,
  onBack,
  onRemove,
  onDismiss,
}: ListViewIdEnumEditorProps) {
  const [picked, setPicked] = useState<number[]>(value);
  const [q, setQ] = useState("");

  const opts = useMemo(() => {
    if (!q) return options;
    const needle = q.toLowerCase();
    return options.filter((o) => o.name.toLowerCase().includes(needle));
  }, [q, options]);

  const toggle = (id: number) => {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
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
          onApply={() => onApply(picked)}
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
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ color: "var(--fg-4)" }}>
          <circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.4" />
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
      <div style={{ maxHeight: 240, overflowY: "auto", margin: "0 -4px", ...FILTER_POPOVER_SCROLL_STYLE }}>
        {opts.map((option) => {
          const on = picked.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => toggle(option.id)}
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
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--ax-gray-25)";
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
              <span style={{ flex: 1 }}>{option.name}</span>
            </button>
          );
        })}
      </div>
    </EditorShell>
  );
}

export interface ListViewCityEnumEditorProps {
  def: Pick<FilterDef, "label" | "fullLabel">;
  countries: string[];
  provinces: string[];
  value?: string[];
  reservedValues?: Set<string>;
  onApply: (values: string[]) => void;
  onBack?: () => void;
  onRemove?: () => void;
  onDismiss?: () => void;
}

export function ListViewCityEnumEditor({
  def,
  countries,
  provinces,
  value = [],
  reservedValues,
  onApply,
  onBack,
  onRemove,
  onDismiss,
}: ListViewCityEnumEditorProps) {
  const [picked, setPicked] = useState<string[]>(value);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [q]);

  const fetchPage = useCallback(
    async (nextPage: number, query: string, append: boolean) => {
      const requestId = ++requestIdRef.current;
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const result = await locationsService.searchCities({
          countries,
          provinces,
          query,
          page: nextPage,
          perPage: CITY_FILTER_PAGE_SIZE,
        });

        if (requestId !== requestIdRef.current) return;

        const names = result.cities
          .map((city) => city.City)
          .filter((name): name is string => Boolean(name?.trim()));

        setOptions((prev) => {
          if (!append) return names;
          const seen = new Set(prev);
          return [...prev, ...names.filter((name) => !seen.has(name))];
        });
        setPage(result.page);
        setHasMore(result.hasMore);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        console.error("[City filter] fetch error:", err);
        if (!append) setOptions([]);
        setHasMore(false);
        setError("Failed to load cities");
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [countries, provinces]
  );

  useEffect(() => {
    void fetchPage(1, debouncedQ, false);
  }, [debouncedQ, fetchPage]);

  const displayOptions = useMemo(() => {
    const merged = [...picked];
    for (const option of options) {
      if (!merged.includes(option)) merged.push(option);
    }
    return merged;
  }, [options, picked]);

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
          onApply={() => onApply(picked)}
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
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ color: "var(--fg-4)" }}>
          <circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.4" />
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
      <div style={{ maxHeight: 240, overflowY: "auto", margin: "0 -4px", ...FILTER_POPOVER_SCROLL_STYLE }}>
        {loading && displayOptions.length === 0 && (
          <div
            style={{
              padding: 16,
              textAlign: "center",
              color: "var(--fg-4)",
              fontSize: "var(--fs-13)",
            }}
          >
            Loading cities…
          </div>
        )}
        {!loading && error && displayOptions.length === 0 && (
          <div
            style={{
              padding: 16,
              textAlign: "center",
              color: "var(--fg-4)",
              fontSize: "var(--fs-13)",
            }}
          >
            {error}
          </div>
        )}
        {!loading && !error && displayOptions.length === 0 && (
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
        {displayOptions.map((o) => {
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
                color: "var(--fg-1)",
                textAlign: "left",
                opacity: reserved ? 0.55 : 1,
              }}
              onMouseEnter={(e) => {
                if (!reserved) e.currentTarget.style.background = "var(--ax-gray-25)";
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
        {hasMore && (
          <button
            type="button"
            onClick={() => void fetchPage(page + 1, debouncedQ, true)}
            disabled={loadingMore}
            style={{
              width: "100%",
              marginTop: 4,
              padding: "8px 8px",
              border: "none",
              borderRadius: "var(--r-sm)",
              background: "transparent",
              color: "var(--ax-cyan-700)",
              fontFamily: "inherit",
              fontSize: "var(--fs-13)",
              fontWeight: 600,
              cursor: loadingMore ? "default" : "pointer",
              opacity: loadingMore ? 0.6 : 1,
            }}
          >
            {loadingMore ? "Loading…" : `Load ${CITY_FILTER_PAGE_SIZE} more`}
          </button>
        )}
      </div>
    </EditorShell>
  );
}
