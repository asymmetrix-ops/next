"use client";
/**
 * ProductDataToggleCard — matches redesign/ProductDataToggle.jsx (tabs + bars / weight rows).
 */
import React from "react";
import {
  LinkPanel,
  LinkedH,
  WeightChip,
  PctBar,
  Pill,
  T,
} from "./primitives";

export type ProductMixTab = "product_type" | "data_collection";

export type ProductBarRow = {
  label: string;
  pct: number;
  displayRight: string;
  color: string;
};

export type DataMixRow = {
  label: string;
  value: string;
};

/** `toggle` = tabbed card; `product_type` / `data_collection` = standalone grid cells */
export type ProductDataCardVariant = "toggle" | "product_type" | "data_collection";

type Props = {
  variant?: ProductDataCardVariant;
  activeTab?: ProductMixTab;
  onTabChange?: (t: ProductMixTab) => void;
  productRows: ProductBarRow[];
  dataRows: DataMixRow[];
  fillGridCell?: boolean;
  /** Shown under title on product-type card, e.g. "FY2025 mix" */
  productSubtitle?: string;
};

function DataValue({ value }: { value: string }) {
  const v = value.trim();
  const lower = v.toLowerCase();
  if (lower === "main" || lower === "primary")
    return <WeightChip weight="Main" hideMinor />;
  if (lower === "secondary")
    return <WeightChip weight="Secondary" hideMinor />;
  if (lower === "minor")
    return <WeightChip weight="Minor" hideMinor={false} />;
  if (v) return <Pill tone="ghost">{v}</Pill>;
  return <span style={{ color: T.faint }}>—</span>;
}

function ProductTypeBody({ productRows }: { productRows: ProductBarRow[] }) {
  return (
    <div style={{ padding: "8px 16px 14px", flex: 1, minHeight: 0 }}>
      {productRows.map((p, i) => (
        <div
          key={`${p.label}-${i}`}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 100px 60px",
            alignItems: "center",
            gap: 12,
            padding: "9px 0",
            borderBottom:
              i === productRows.length - 1 ? "none" : `1px solid ${T.hair}`,
            fontSize: 12.5,
          }}
        >
          <div
            style={{
              color: T.body,
              display: "flex",
              alignItems: "center",
              gap: 8,
              minWidth: 0,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: p.color,
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              {p.label}
            </span>
          </div>
          <PctBar pct={p.pct} color={p.color} />
          <div
            style={{
              fontFamily: T.mono,
              fontSize: 12,
              color: T.ink,
              textAlign: "right",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {p.displayRight}
          </div>
        </div>
      ))}
    </div>
  );
}

function DataCollectionBody({ dataRows }: { dataRows: DataMixRow[] }) {
  return (
    <div style={{ padding: "8px 16px 14px", flex: 1, minHeight: 0 }}>
      {dataRows.map((d, i) => (
        <div
          key={`${d.label}-${i}`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "9px 0",
            gap: 12,
            borderBottom:
              i === dataRows.length - 1 ? "none" : `1px solid ${T.hair}`,
            fontSize: 12.5,
          }}
        >
          <div style={{ color: T.body, minWidth: 0 }}>{d.label}</div>
          <DataValue value={d.value} />
        </div>
      ))}
    </div>
  );
}

export function ProductDataToggleCard({
  variant = "toggle",
  activeTab = "product_type",
  onTabChange,
  productRows,
  dataRows,
  fillGridCell = true,
  productSubtitle,
}: Props) {
  if (variant === "product_type") {
    return (
      <LinkPanel fillGridCell={fillGridCell}>
        <LinkedH right={productSubtitle ? (
          <span style={{ fontSize: 11.5, color: T.muted }}>
            {productSubtitle}
          </span>
        ) : undefined}>
          Product type
        </LinkedH>
        <ProductTypeBody productRows={productRows} />
      </LinkPanel>
    );
  }

  if (variant === "data_collection") {
    return (
      <LinkPanel fillGridCell={fillGridCell}>
        <LinkedH>Data collection method</LinkedH>
        <DataCollectionBody dataRows={dataRows} />
      </LinkPanel>
    );
  }

  const tabBtn = (id: ProductMixTab, label: string) => (
    <button
      key={id}
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onTabChange?.(id);
      }}
      style={{
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        fontFamily: T.sans,
        fontSize: 13.5,
        fontWeight: 600,
        color: activeTab === id ? T.ink : T.muted,
        borderBottom: `2px solid ${activeTab === id ? T.azure : "transparent"}`,
        paddingBottom: 4,
        transition: "color 120ms, border-color 120ms",
      }}
    >
      {label}
    </button>
  );

  return (
    <LinkPanel fillGridCell={fillGridCell}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px 10px",
          flexShrink: 0,
          borderBottom: `1px solid ${T.hair}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: 18 }}>
          {tabBtn("product_type", "Product type")}
          {tabBtn("data_collection", "Data collection")}
        </div>
        <div
          style={{
            fontSize: 14,
            color: T.azure,
            fontWeight: 500,
            lineHeight: 1,
            padding: "2px 4px",
          }}
        >
          →
        </div>
      </div>

      {activeTab === "product_type" ? (
        <ProductTypeBody productRows={productRows} />
      ) : (
        <DataCollectionBody dataRows={dataRows} />
      )}
    </LinkPanel>
  );
}
