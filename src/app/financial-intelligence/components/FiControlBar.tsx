"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FilterDef, FilterState } from "@/app/financials-tsx/types";
import { FIN_FILTER_DEFS } from "@/app/financials-tsx/financials-data";
import {
  searchFiCompanies,
  type FiCompanySearchHit,
} from "@/lib/financialIntelligence/apiClient";
import {
  FI_SOURCE_TYPES_UI_ORDER,
  SOURCE_TYPE_DESCRIPTIONS,
  sourceTypeColor,
  type FiMetricSourceType,
} from "@/lib/financialIntelligence/sourceTypes";
import {
  ListViewEnumEditor,
  ListViewIdEnumEditor,
  ListViewRangeEditor,
} from "@/components/filters/ListViewFilterEditors";
import { SourceTypeDot } from "./SourceTypeValue";
import { FiFilterPicker } from "./FiFilterPicker";
import { CompanyAvatar } from "@/components/CompanyAvatar";

export interface FiIdOption {
  id: number;
  name: string;
}

/** @deprecated Use FiIdOption */
export type FiCountryOption = FiIdOption;

const ID_FILTER_IDS = new Set(["country", "region"]);

const FILTER_BAR_CSS = `
  .fi-control-root { font-family: var(--font-sans); }
  .fi-control-root .ax-eyebrow {
    font-size: 11px; font-weight: 600;
    letter-spacing: 0.04em; text-transform: uppercase;
    color: var(--fg-3);
  }
`;

const API_FILTER_IDS = new Set([
  "region",
  "country",
  "primary_sector",
  "secondary_sector",
  "revenue",
  "ev",
  "ebitda_margin",
]);

function isUnboundedMax(max: number | undefined): boolean {
  if (max === undefined) return false;
  return max >= 999999 || max >= 1e15 || max === Number.MAX_SAFE_INTEGER;
}

function formatRangeValue(
  v: { min?: number; max?: number } | null | undefined,
  unit?: string
): string {
  if (!v) return "";
  const fmt = (n: number) => {
    if (unit === "$m") {
      return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}m`;
    }
    if (unit === "%") return `${n}%`;
    if (unit === "x") return `${n}x`;
    return n.toLocaleString();
  };
  if (v.min !== undefined && v.max !== undefined) {
    if (isUnboundedMax(v.max)) return `${fmt(v.min)} – no limit`;
    return `${fmt(v.min)}–${fmt(v.max)}`;
  }
  if (v.min !== undefined) return `≥ ${fmt(v.min)}`;
  if (v.max !== undefined) return `≤ ${fmt(v.max)}`;
  return "";
}

function summarize(
  def: FilterDef,
  value: unknown,
  countryOptions: FiIdOption[] = [],
  regionOptions: FiIdOption[] = []
): string {
  if (value == null) return "";
  if (ID_FILTER_IDS.has(def.id) && Array.isArray(value)) {
    const options = def.id === "country" ? countryOptions : regionOptions;
    const labels = value
      .map((item) => options.find((c) => c.id === Number(item))?.name)
      .filter(Boolean) as string[];
    if (labels.length === 0) return "";
    if (labels.length === 1) return labels[0];
    return `${labels[0]} +${labels.length - 1}`;
  }
  if (def.editor === "enum") {
    if (!Array.isArray(value) || value.length === 0) return "";
    if (value.length === 1) return String(value[0]);
    return `${String(value[0])} +${value.length - 1}`;
  }
  if (def.editor === "range") {
    return formatRangeValue(value as { min?: number; max?: number }, def.unit);
  }
  return String(value);
}

function Pop({
  anchorRef,
  onDismiss,
  children,
  width = 260,
  bare = false,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  onDismiss: () => void;
  children: React.ReactNode;
  width?: number;
  bare?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    function place() {
      if (!anchorRef.current || !ref.current) return;
      const a = anchorRef.current.getBoundingClientRect();
      let left = a.left;
      const vw = window.innerWidth;
      if (left + width > vw - 10) left = vw - width - 10;
      setPos({ top: a.bottom + 6, left });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchorRef, width]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current?.contains(e.target as Node)) return;
      if (anchorRef.current?.contains(e.target as Node)) return;
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
      style={{
        position: "fixed",
        top: pos?.top ?? 0,
        left: pos?.left ?? 0,
        width: bare ? undefined : width,
        visibility: pos ? "visible" : "hidden",
        zIndex: 9999,
        background: bare ? "transparent" : "white",
        border: bare ? "none" : "1px solid var(--border-1)",
        borderRadius: bare ? 0 : "var(--r-lg)",
        boxShadow: bare ? "none" : "var(--shadow-popover)",
        padding: bare ? 0 : 10,
        fontFamily: "var(--font-sans)",
      }}
    >
      {children}
    </div>
  );
}

function FilterChip({
  def,
  value,
  onEdit,
  onRemove,
  countryOptions = [],
  regionOptions = [],
}: {
  def: FilterDef;
  value: unknown;
  onEdit: () => void;
  onRemove: () => void;
  countryOptions?: FiIdOption[];
  regionOptions?: FiIdOption[];
}) {
  const [hover, setHover] = useState(false);
  const summary = summarize(def, value, countryOptions, regionOptions);

  return (
    <span
      onClick={onEdit}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: "var(--ax-cyan-50)",
        border: "1px solid var(--ax-cyan-100)",
        borderRadius: "var(--r-md)",
        fontSize: "var(--fs-13)",
        fontFamily: "var(--font-sans)",
        cursor: "pointer",
        userSelect: "none",
        height: 30,
        transition: "box-shadow 120ms",
        boxShadow: hover ? "0 1px 2px rgba(17,22,29,0.08)" : "none",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "0 8px 0 10px",
          color: "var(--ax-cyan-700)",
          fontWeight: 500,
        }}
      >
        {def.label}:
      </span>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "0 8px",
          color: "var(--ax-cyan-700)",
          fontWeight: 600,
          borderLeft: "1px dashed var(--ax-cyan-200)",
          whiteSpace: "nowrap",
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
          color: hover ? "var(--fg-2)" : "var(--fg-4)",
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

function CompanySearchPanel({
  query,
  onQueryChange,
  results,
  onPick,
  placeholder = "Search companies…",
  inputRef,
  showClearTarget,
  onClearTarget,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  results: FiCompanySearchHit[];
  onPick: (item: FiCompanySearchHit) => void;
  placeholder?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  showClearTarget?: boolean;
  onClearTarget?: () => void;
}) {
  return (
    <>
      <div style={{ position: "relative", marginBottom: 8 }}>
        <span
          style={{
            position: "absolute",
            left: 9,
            top: "50%",
            transform: "translateY(-50%)",
            lineHeight: 0,
            color: "var(--fg-4)",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.4" />
            <path
              d="M10.5 10.5L13.5 13.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "7px 10px 7px 30px",
            border: "1px solid var(--border-1)",
            borderRadius: "var(--r-md)",
            fontSize: "var(--fs-13)",
            fontFamily: "var(--font-sans)",
            color: "var(--fg-1)",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          maxHeight: 280,
          overflowY: "auto",
        }}
      >
        {results.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--fg-4)", padding: "6px" }}>
            {query.trim().length < 2
              ? "Type at least 2 characters…"
              : "No companies match."}
          </div>
        )}
        {results.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onPick(item)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              textAlign: "left",
              padding: "6px 7px",
              border: "none",
              background: "transparent",
              borderRadius: 6,
              fontSize: "var(--fs-13)",
              color: "var(--fg-1)",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--ax-gray-50)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <CompanyAvatar name={item.name} logo={item.logo} size={18} />
            <span style={{ fontWeight: 600, flex: 1, minWidth: 0 }}>{item.name}</span>
            <svg
              width="11"
              height="11"
              viewBox="0 0 12 12"
              style={{ flexShrink: 0, color: "var(--ax-cyan-700)" }}
            >
              <path
                d="M6 2v8M2 6h8"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ))}
      </div>
      {showClearTarget && onClearTarget && (
        <button
          type="button"
          onClick={onClearTarget}
          style={{
            marginTop: 8,
            width: "100%",
            padding: "6px 10px",
            border: "none",
            background: "transparent",
            color: "var(--fg-link)",
            fontSize: "var(--fs-12)",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
            textAlign: "left",
          }}
        >
          Clear target
        </button>
      )}
    </>
  );
}

export interface FiControlBarProps {
  targetId: number | null;
  targetName: string | null;
  targetLogo: string | null;
  targetUrl: string | null;
  loading: boolean;
  onSelectTarget: (companyId: number, meta?: FiCompanySearchHit) => void;
  onClearTarget: () => void;
  filters: FilterState[];
  onAddFilter: (filter: FilterState) => void;
  onUpdateFilter: (filter: FilterState) => void;
  onRemoveFilter: (id: string) => void;
  primarySectorOptions: string[];
  secondarySectorOptions: string[];
  regionOptions: FiIdOption[];
  countryOptions: FiIdOption[];
  peerCount: number;
  isDefaultMode: boolean;
  onResetToDefault: () => void;
  onApplySuggestedFilters?: () => void;
  allowedSources: FiMetricSourceType[];
  onToggleSourceType: (type: FiMetricSourceType) => void;
  addQuery: string;
  onAddQueryChange: (query: string) => void;
  addResults: FiCompanySearchHit[];
  onAddCompany: (companyId: number) => void;
}

export function FiControlBar({
  targetId,
  targetName,
  targetLogo,
  targetUrl,
  loading,
  onSelectTarget,
  onClearTarget,
  filters,
  onAddFilter,
  onUpdateFilter,
  onRemoveFilter,
  primarySectorOptions,
  secondarySectorOptions,
  regionOptions,
  countryOptions,
  peerCount,
  isDefaultMode,
  onResetToDefault,
  onApplySuggestedFilters,
  allowedSources,
  onToggleSourceType,
  addQuery,
  onAddQueryChange,
  addResults,
  onAddCompany,
}: FiControlBarProps) {
  const [targetPickerOpen, setTargetPickerOpen] = useState(false);
  const [targetSearchQuery, setTargetSearchQuery] = useState("");
  const [targetSearchResults, setTargetSearchResults] = useState<FiCompanySearchHit[]>([]);
  const [addFilterOpen, setAddFilterOpen] = useState(false);
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  const [editingFilterId, setEditingFilterId] = useState<string | null>(null);
  const [pendingDef, setPendingDef] = useState<FilterDef | null>(null);

  const targetPickerRef = useRef<HTMLButtonElement>(null);
  const targetSearchInputRef = useRef<HTMLInputElement>(null);
  const addFilterRef = useRef<HTMLButtonElement>(null);
  const addCompanyRef = useRef<HTMLButtonElement>(null);
  const addCompanyInputRef = useRef<HTMLInputElement>(null);
  const chipRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const editingAnchorRef = useRef<HTMLElement | null>(null);

  const availableDefs = FIN_FILTER_DEFS.filter(
    (def) => API_FILTER_IDS.has(def.id) && !filters.some((f) => f.id === def.id)
  );
  const pendingDefResolved = pendingDef;
  const editingFilter = filters.find((f) => f.id === editingFilterId);
  const editingDef = editingFilter
    ? FIN_FILTER_DEFS.find((d) => d.id === editingFilter.id)
    : null;

  const filterOptionCounts: Partial<Record<string, number>> = {
    region: regionOptions.length,
    country: countryOptions.length,
    primary_sector: primarySectorOptions.length,
    secondary_sector: secondarySectorOptions.length,
  };

  const renderFilterEditor = (
    def: FilterDef,
    onApply: (value: FilterState["value"]) => void,
    options?: {
      initial?: FilterState["value"];
      onBack?: () => void;
      onRemove?: () => void;
      onDismiss?: () => void;
    }
  ) => {
    const dismiss = options?.onDismiss ?? (() => {});

    if (ID_FILTER_IDS.has(def.id)) {
      return (
        <ListViewIdEnumEditor
          def={def}
          options={idOptionsForDef(def)}
          value={initialIdFilterValues(options?.initial)}
          onApply={(values) => onApply(values)}
          onBack={options?.onBack}
          onRemove={options?.onRemove}
          onDismiss={dismiss}
        />
      );
    }
    if (def.editor === "enum") {
      return (
        <ListViewEnumEditor
          def={def}
          options={optionsForDef(def)}
          value={
            Array.isArray(options?.initial) ? (options.initial as string[]) : []
          }
          onApply={(values) => onApply(values)}
          onBack={options?.onBack}
          onRemove={options?.onRemove}
          onDismiss={dismiss}
        />
      );
    }
    const initialRange =
      typeof options?.initial === "object" &&
      options.initial != null &&
      !Array.isArray(options.initial)
        ? (options.initial as { min?: number; max?: number })
        : null;

    return (
      <ListViewRangeEditor
        key={`${def.id}-${initialRange?.min ?? "x"}-${initialRange?.max ?? "x"}`}
        def={def}
        value={initialRange}
        onApply={(value) => {
          if (value) onApply(value);
        }}
        onBack={options?.onBack}
        onRemove={options?.onRemove}
        onDismiss={dismiss}
      />
    );
  };

  const optionsForDef = (def: FilterDef): string[] => {
    switch (def.id) {
      case "primary_sector":
        return primarySectorOptions;
      case "secondary_sector":
        return secondarySectorOptions;
      default:
        return def.options ?? [];
    }
  };

  const idOptionsForDef = (def: FilterDef): FiIdOption[] => {
    if (def.id === "country") return countryOptions;
    if (def.id === "region") return regionOptions;
    return [];
  };

  const initialIdFilterValues = (value: unknown): number[] => {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => Number(item))
      .filter((n) => Number.isFinite(n) && n > 0);
  };

  useEffect(() => {
    if (targetSearchQuery.trim().length < 2) {
      setTargetSearchResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      const items = await searchFiCompanies(targetSearchQuery);
      setTargetSearchResults(items);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [targetSearchQuery]);

  useEffect(() => {
    if (targetPickerOpen) {
      const t = window.setTimeout(() => targetSearchInputRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
    setTargetSearchQuery("");
    setTargetSearchResults([]);
  }, [targetPickerOpen]);

  useEffect(() => {
    if (addCompanyOpen) {
      const t = window.setTimeout(() => addCompanyInputRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
  }, [addCompanyOpen]);

  return (
    <div className="fi-control-root" style={{ marginBottom: 16 }}>
      <style>{FILTER_BAR_CSS}</style>
      <div
        style={{
          background: "white",
          border: "1px solid var(--border-1)",
          borderRadius: "var(--r-lg)",
          padding: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <span className="ax-eyebrow">Target</span>

          <button
            ref={targetPickerRef}
            type="button"
            disabled={loading}
            onClick={() => setTargetPickerOpen((v) => !v)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 10px 5px 6px",
              background: targetId ? "var(--ax-cyan-50)" : "white",
              border: `1px solid ${targetId ? "var(--border-brand)" : "var(--border-2)"}`,
              borderRadius: "var(--r-md)",
              cursor: loading ? "default" : "pointer",
              fontFamily: "var(--font-sans)",
              height: 30,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {targetId && targetName ? (
              <>
                <CompanyAvatar name={targetName} logo={targetLogo} />
                {targetUrl ? (
                  <a
                    href={targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      fontWeight: 700,
                      fontSize: "var(--fs-14)",
                      color: "var(--fg-1)",
                      textDecoration: "none",
                    }}
                  >
                    {targetName}
                  </a>
                ) : (
                  <span style={{ fontWeight: 700, fontSize: "var(--fs-14)", color: "var(--fg-1)" }}>
                    {targetName}
                  </span>
                )}
              </>
            ) : (
              <span style={{ fontSize: "var(--fs-13)", color: "var(--fg-3)", fontWeight: 500 }}>
                Search companies…
              </span>
            )}
            <svg width="10" height="10" viewBox="0 0 12 12">
              <path
                d="M3 5l3 3 3-3"
                stroke="var(--fg-3)"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {targetPickerOpen && (
            <Pop
              anchorRef={targetPickerRef}
              onDismiss={() => setTargetPickerOpen(false)}
              width={300}
            >
              <CompanySearchPanel
                inputRef={targetSearchInputRef}
                query={targetSearchQuery}
                onQueryChange={setTargetSearchQuery}
                results={targetSearchResults}
                placeholder="Search companies…"
                showClearTarget={Boolean(targetId)}
                onClearTarget={() => {
                  onClearTarget();
                  setTargetPickerOpen(false);
                }}
                onPick={(item) => {
                  onSelectTarget(item.id, item);
                  setTargetPickerOpen(false);
                }}
              />
            </Pop>
          )}

          {targetId && (
            <>
              <span
                style={{
                  width: 1,
                  height: 20,
                  background: "var(--border-1)",
                  margin: "0 2px",
                }}
              />

              <span className="ax-eyebrow">Peer set</span>

              {filters.map((filter) => {
                const def = FIN_FILTER_DEFS.find((d) => d.id === filter.id);
                if (!def) return null;
                return (
                  <span
                    key={filter.id}
                    ref={(el) => {
                      chipRefs.current[filter.id] = el;
                    }}
                  >
                    <FilterChip
                      def={def}
                      value={filter.value}
                      countryOptions={countryOptions}
                      regionOptions={regionOptions}
                      onEdit={() => {
                        editingAnchorRef.current = chipRefs.current[filter.id];
                        setEditingFilterId(filter.id);
                      }}
                      onRemove={() => onRemoveFilter(filter.id)}
                    />
                  </span>
                );
              })}

              {editingFilterId && editingFilter && editingDef && (
                <Pop
                  anchorRef={editingAnchorRef}
                  onDismiss={() => setEditingFilterId(null)}
                  bare
                >
                  {renderFilterEditor(
                    editingDef,
                    (value) => {
                      onUpdateFilter({ id: editingFilter.id, value });
                      setEditingFilterId(null);
                    },
                    {
                      initial: editingFilter.value,
                      onRemove: () => {
                        onRemoveFilter(editingFilter.id);
                        setEditingFilterId(null);
                      },
                      onDismiss: () => setEditingFilterId(null),
                    }
                  )}
                </Pop>
              )}

              <button
                ref={addFilterRef}
                type="button"
                onClick={() => {
                  setAddFilterOpen((v) => !v);
                  setPendingDef(null);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 10px",
                  background: addFilterOpen ? "var(--ax-gray-25)" : "white",
                  border: `1px dashed ${addFilterOpen ? "var(--border-2)" : "var(--border-2)"}`,
                  borderRadius: "var(--r-md)",
                  cursor: "pointer",
                  fontSize: "var(--fs-13)",
                  color: "var(--fg-2)",
                  fontWeight: 500,
                  fontFamily: "var(--font-sans)",
                  height: 30,
                }}
              >
                <svg width="11" height="11" viewBox="0 0 12 12">
                  <path
                    d="M6 2v8M2 6h8"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
                Add filter
              </button>

              {addFilterOpen && (
                <FiFilterPicker
                  anchorRef={addFilterRef}
                  onDismiss={() => {
                    setAddFilterOpen(false);
                    setPendingDef(null);
                  }}
                  availableDefs={availableDefs}
                  activeDef={pendingDefResolved}
                  onPickDef={setPendingDef}
                  optionCounts={filterOptionCounts}
                  editorContent={
                    pendingDefResolved
                      ? renderFilterEditor(
                          pendingDefResolved,
                          (value) => {
                            onAddFilter({ id: pendingDefResolved.id, value });
                            setAddFilterOpen(false);
                            setPendingDef(null);
                          },
                          {
                            onBack: () => setPendingDef(null),
                            onDismiss: () => {
                              setAddFilterOpen(false);
                              setPendingDef(null);
                            },
                          }
                        )
                      : undefined
                  }
                />
              )}

              <button
                ref={addCompanyRef}
                type="button"
                onClick={() => setAddCompanyOpen((v) => !v)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 10px",
                  background: "var(--ax-cyan-50)",
                  border: "1px solid var(--border-brand)",
                  borderRadius: "var(--r-md)",
                  cursor: "pointer",
                  fontSize: "var(--fs-13)",
                  color: "var(--ax-cyan-700)",
                  fontWeight: 600,
                  fontFamily: "var(--font-sans)",
                  height: 30,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <circle cx="6" cy="6" r="3" stroke="currentColor" strokeWidth="1.4" />
                  <path
                    d="M11.5 11.5l2.5 2.5M11.5 4.5v4M9.5 6.5h4"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
                Add company
              </button>

              {addCompanyOpen && (
                <Pop anchorRef={addCompanyRef} onDismiss={() => setAddCompanyOpen(false)} width={300}>
                  <CompanySearchPanel
                    inputRef={addCompanyInputRef}
                    query={addQuery}
                    onQueryChange={onAddQueryChange}
                    results={addResults}
                    placeholder="Search companies to add…"
                    onPick={(item) => {
                      onAddCompany(item.id);
                      onAddQueryChange("");
                    }}
                  />
                </Pop>
              )}

              <div
                style={{
                  marginLeft: "auto",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                {filters.length === 0 && onApplySuggestedFilters && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={onApplySuggestedFilters}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "var(--fg-link)",
                      fontSize: "var(--fs-12)",
                      fontWeight: 600,
                      cursor: loading ? "default" : "pointer",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    Apply suggested filters
                  </button>
                )}
                <button
                  type="button"
                  disabled={isDefaultMode || loading}
                  onClick={onResetToDefault}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: isDefaultMode ? "var(--fg-4)" : "var(--fg-link)",
                    fontSize: "var(--fs-12)",
                    fontWeight: 600,
                    cursor: isDefaultMode ? "default" : "pointer",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  Reset to default
                </button>
                <span style={{ fontSize: "var(--fs-13)", color: "var(--fg-3)" }}>
                  <strong style={{ color: "var(--fg-1)", fontWeight: 700 }}>{peerCount}</strong> peers
                </span>
              </div>
            </>
          )}
        </div>

        {targetId && (
          <div
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: "1px solid var(--ax-gray-100)",
            }}
          >
            <div
              className="ax-eyebrow"
              style={{ marginBottom: 10 }}
            >
              Data source
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              {FI_SOURCE_TYPES_UI_ORDER.map((type) => {
                const checked = allowedSources.includes(type);
                const disabled = loading || (checked && allowedSources.length <= 1);
                return (
                  <label
                    key={type}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "10px 14px",
                      borderRadius: "var(--r-md)",
                      border: checked
                        ? `1px solid ${sourceTypeColor(type)}33`
                        : "1px solid var(--border-1)",
                      background: checked ? "white" : "var(--ax-gray-25)",
                      cursor: disabled ? "default" : "pointer",
                      opacity: disabled && !checked ? 0.55 : 1,
                      minWidth: 200,
                      flex: "1 1 200px",
                      maxWidth: 280,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => onToggleSourceType(type)}
                      style={{
                        marginTop: 3,
                        accentColor: sourceTypeColor(type),
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ minWidth: 0 }}>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                          fontSize: "var(--fs-13)",
                          fontWeight: 600,
                          color: "var(--fg-1)",
                        }}
                      >
                        <SourceTypeDot type={type} size={8} />
                        {type}
                      </span>
                      <span
                        style={{
                          display: "block",
                          marginTop: 3,
                          fontSize: 11,
                          lineHeight: 1.35,
                          color: "var(--fg-3)",
                        }}
                      >
                        {SOURCE_TYPE_DESCRIPTIONS[type]}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
