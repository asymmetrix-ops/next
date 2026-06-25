"use client";

import React from "react";
import type { FilterDef, FilterState } from "@/app/financials-tsx/types";
import { FIN_FILTER_DEFS } from "@/app/financials-tsx/financials-data";

const API_FILTER_IDS = new Set([
  "region",
  "country",
  "primary_sector",
  "secondary_sector",
  "revenue",
  "ev",
  "ebitda_margin",
]);

function formatChipValue(def: FilterDef, filter: FilterState): string {
  if (def.editor === "range") {
    const value = filter.value;
    if (typeof value === "object" && !Array.isArray(value)) {
      const { min, max } = value;
      if (min != null && max != null) return `${min}–${max}${def.unit ? def.unit : ""}`;
      if (min != null) return `≥ ${min}${def.unit ? def.unit : ""}`;
      if (max != null) return `≤ ${max}${def.unit ? def.unit : ""}`;
    }
    return def.label;
  }

  if (Array.isArray(filter.value)) return filter.value.join(", ");
  return String(filter.value ?? def.label);
}

interface FiFilterBarProps {
  filters: FilterState[];
  onRemoveFilter: (id: string) => void;
  onAddFilter: (filter: FilterState) => void;
  primarySectorOptions: string[];
  secondarySectorOptions: string[];
  regionOptions: string[];
  countryOptions: string[];
}

export function FiFilterBar({
  filters,
  onRemoveFilter,
  onAddFilter,
  primarySectorOptions,
  secondarySectorOptions,
  regionOptions,
  countryOptions,
}: FiFilterBarProps) {
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [activeDefId, setActiveDefId] = React.useState<string | null>(null);

  const availableDefs = FIN_FILTER_DEFS.filter(
    (def) => API_FILTER_IDS.has(def.id) && !filters.some((f) => f.id === def.id)
  );

  const activeDef = availableDefs.find((def) => def.id === activeDefId);

  const optionsForDef = (def: FilterDef): string[] => {
    switch (def.id) {
      case "primary_sector":
        return primarySectorOptions;
      case "secondary_sector":
        return secondarySectorOptions;
      case "region":
        return regionOptions;
      case "country":
        return countryOptions;
      default:
        return def.options ?? [];
    }
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      {filters.map((filter) => {
        const def = FIN_FILTER_DEFS.find((item) => item.id === filter.id);
        if (!def) return null;
        return (
          <span
            key={filter.id}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px",
              borderRadius: 999,
              background: "var(--ax-gray-100)",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--fg-2)",
            }}
          >
            {def.label}: {formatChipValue(def, filter)}
            <button
              type="button"
              onClick={() => onRemoveFilter(filter.id)}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "var(--fg-3)",
              }}
              aria-label={`Remove ${def.label} filter`}
            >
              ×
            </button>
          </span>
        );
      })}

      <div style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => {
            setPickerOpen((v) => !v);
            setActiveDefId(null);
          }}
          style={{
            padding: "5px 12px",
            borderRadius: 999,
            border: "1px dashed var(--border-1)",
            background: "white",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            color: "var(--ax-cyan-700)",
          }}
        >
          + Add filter
        </button>

        {pickerOpen && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: 6,
              minWidth: 260,
              background: "white",
              border: "1px solid var(--border-1)",
              borderRadius: "var(--r-md)",
              boxShadow: "var(--shadow-md)",
              zIndex: 15,
              padding: 10,
            }}
          >
            {!activeDef ? (
              availableDefs.map((def) => (
                <button
                  key={def.id}
                  type="button"
                  onClick={() => setActiveDefId(def.id)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 10px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  {def.fullLabel}
                </button>
              ))
            ) : activeDef.editor === "enum" ? (
              <EnumPicker
                options={optionsForDef(activeDef)}
                onApply={(values) => {
                  onAddFilter({ id: activeDef.id, value: values });
                  setPickerOpen(false);
                  setActiveDefId(null);
                }}
                onBack={() => setActiveDefId(null)}
              />
            ) : (
              <RangePicker
                def={activeDef}
                onApply={(value) => {
                  onAddFilter({ id: activeDef.id, value });
                  setPickerOpen(false);
                  setActiveDefId(null);
                }}
                onBack={() => setActiveDefId(null)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EnumPicker({
  options,
  onApply,
  onBack,
}: {
  options: string[];
  onApply: (values: string[]) => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = React.useState<string[]>([]);

  return (
    <div>
      <button type="button" onClick={onBack} style={{ fontSize: 12, marginBottom: 8 }}>
        ← Back
      </button>
      <div style={{ maxHeight: 220, overflow: "auto" }}>
        {options.map((option) => (
          <label
            key={option}
            style={{ display: "flex", gap: 8, padding: "6px 0", fontSize: 13 }}
          >
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={(e) => {
                setSelected((prev) =>
                  e.target.checked
                    ? [...prev, option]
                    : prev.filter((item) => item !== option)
                );
              }}
            />
            {option}
          </label>
        ))}
      </div>
      <button
        type="button"
        disabled={selected.length === 0}
        onClick={() => onApply(selected)}
        style={{
          marginTop: 8,
          padding: "6px 12px",
          borderRadius: "var(--r-sm)",
          border: "none",
          background: "var(--ax-cyan-700)",
          color: "white",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Apply
      </button>
    </div>
  );
}

function RangePicker({
  def,
  onApply,
  onBack,
}: {
  def: FilterDef;
  onApply: (value: { min?: number; max?: number }) => void;
  onBack: () => void;
}) {
  const [min, setMin] = React.useState<string>("");
  const [max, setMax] = React.useState<string>("");

  return (
    <div>
      <button type="button" onClick={onBack} style={{ fontSize: 12, marginBottom: 8 }}>
        ← Back
      </button>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input
          type="number"
          placeholder="Min"
          value={min}
          onChange={(e) => setMin(e.target.value)}
          style={{ padding: 8, border: "1px solid var(--border-1)", borderRadius: "var(--r-sm)" }}
        />
        <input
          type="number"
          placeholder="Max"
          value={max}
          onChange={(e) => setMax(e.target.value)}
          style={{ padding: 8, border: "1px solid var(--border-1)", borderRadius: "var(--r-sm)" }}
        />
      </div>
      {def.presets && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {def.presets.map(([label, pMin, pMax]) => (
            <button
              key={label}
              type="button"
              onClick={() => onApply({ min: pMin, max: pMax })}
              style={{
                padding: "4px 8px",
                borderRadius: 999,
                border: "1px solid var(--border-1)",
                background: "var(--ax-gray-25)",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() =>
          onApply({
            min: min ? Number(min) : undefined,
            max: max ? Number(max) : undefined,
          })
        }
        style={{
          marginTop: 8,
          padding: "6px 12px",
          borderRadius: "var(--r-sm)",
          border: "none",
          background: "var(--ax-cyan-700)",
          color: "white",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Apply {def.unit ? `(${def.unit})` : ""}
      </button>
    </div>
  );
}
