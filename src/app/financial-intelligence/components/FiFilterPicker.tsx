"use client";

import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { FilterDef } from "@/app/financials-tsx/types";
import { FIN_FILTER_CATEGORIES } from "@/app/financials-tsx/financials-data";
import {
  AnchoredPopover,
  FILTER_POPOVER_SCROLL_STYLE,
} from "@/components/filters/AnchoredPopover";

const FI_PICKER_CATEGORY_LABELS: Record<string, string> = {
  company: "Location",
  sector: "Sectors",
  valuation: "Valuation",
  profitability: "Financials",
  growth: "Growth",
};

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

function PickerRow({
  def,
  hint,
  onPick,
}: {
  def: FilterDef;
  hint: string;
  onPick: () => void;
}) {
  const [hover, setHover] = useState(false);

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
        <span style={{ fontSize: 10.5, color: "var(--fg-4)", flexShrink: 0 }}>{hint}</span>
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

function hintForDef(def: FilterDef, optionCount?: number): string {
  if (def.editor === "enum") {
    const n = optionCount ?? def.options?.length ?? 0;
    return `${n} options`;
  }
  if (def.editor === "range") return `range${def.unit ? ` (${def.unit})` : ""}`;
  return "";
}

export function FiFilterEditorShell({
  title,
  onBack,
  onClose,
  children,
}: {
  title: string;
  onBack?: () => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
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
      <div
        style={{
          padding: "12px 14px 10px",
          borderBottom: "1px solid var(--ax-gray-100)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: 0,
              color: "var(--fg-3)",
              display: "inline-flex",
            }}
            aria-label="Back"
          >
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
              <path
                d="M7 2L3 6l4 4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
        <div style={{ flex: 1, fontSize: "var(--fs-14)", fontWeight: 700, color: "var(--fg-1)" }}>
          {title}
        </div>
        <FilterPanelCloseButton onClick={onClose} />
      </div>
      <div
        style={{
          padding: "10px 14px 12px",
          overflowY: "auto",
          ...FILTER_POPOVER_SCROLL_STYLE,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function FiFilterPicker({
  anchorRef,
  onDismiss,
  availableDefs,
  activeDef,
  onPickDef,
  editorContent,
  optionCounts,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  onDismiss: () => void;
  availableDefs: FilterDef[];
  activeDef: FilterDef | null;
  onPickDef: (def: FilterDef) => void;
  editorContent?: React.ReactNode;
  optionCounts?: Partial<Record<string, number>>;
}) {
  const [q, setQ] = useState("");
  const [focusToken, setFocusToken] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const layoutKey = activeDef?.id ?? "list";

  useLayoutEffect(() => {
    if (activeDef || focusToken === 0) return;
    requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
  }, [activeDef, focusToken]);

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

  const categories = useMemo(() => {
    return FIN_FILTER_CATEGORIES.filter((cat) =>
      filtered.some((def) => def.category === cat.id)
    );
  }, [filtered]);

  const byCat = useMemo(() => {
    const map: Record<string, FilterDef[]> = {};
    for (const cat of categories) map[cat.id] = [];
    for (const def of filtered) {
      if (!map[def.category]) map[def.category] = [];
      map[def.category].push(def);
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

  if (activeDef && editorContent) {
    return (
      <AnchoredPopover
        anchorRef={anchorRef}
        onDismiss={onDismiss}
        layoutKey={layoutKey}
        width={380}
        offset={6}
        bare
      >
        {editorContent}
      </AnchoredPopover>
    );
  }

  return (
    <AnchoredPopover
      anchorRef={anchorRef}
      onDismiss={onDismiss}
      layoutKey={layoutKey}
      width={380}
      offset={6}
      bare
      onPositioned={() => setFocusToken((t) => t + 1)}
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
        <div style={{ padding: "12px 14px 10px", borderBottom: "1px solid var(--ax-gray-100)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
              gap: 8,
            }}
          >
            <div style={{ fontSize: "var(--fs-14)", fontWeight: 700, color: "var(--fg-1)" }}>
              Add filter
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: "var(--fg-4)" }} className="ax-numeric">
                {availableDefs.length} available
              </div>
              <FilterPanelCloseButton onClick={onDismiss} />
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
              <circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.4" />
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
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "6px 6px 8px",
            ...FILTER_POPOVER_SCROLL_STYLE,
          }}
        >
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
                    {FI_PICKER_CATEGORY_LABELS[cat.id] ?? cat.name}
                  </span>
                  <span className="ax-numeric" style={{ fontSize: 10.5, color: "var(--fg-4)" }}>
                    {defs.length}
                  </span>
                </div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {defs.map((def) => (
                    <PickerRow
                      key={def.id}
                      def={def}
                      hint={hintForDef(def, optionCounts?.[def.id])}
                      onPick={() => onPickDef(def)}
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
              No filters match
            </div>
          )}
        </div>

        <div
          style={{
            padding: "8px 14px",
            borderTop: "1px solid var(--ax-gray-100)",
            background: "var(--ax-gray-25)",
            fontSize: 11,
            color: "var(--fg-3)",
          }}
        >
          <kbd style={kbdStyle}>↑↓</kbd> navigate · <kbd style={kbdStyle}>↵</kbd> select
        </div>
      </div>
    </AnchoredPopover>
  );
}
