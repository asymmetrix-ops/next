"use client";
/**
 * ProductDataToggleCard — matches redesign/ProductDataToggle.jsx (tabs + bars / weight rows).
 */
import React from "react";
import { EMPTY_DISPLAY } from "@/lib/emptyDisplay";
import {
  LinkPanel,
  LinkedH,
  T,
  descriptionBodyStyle,
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
};

function ProductTypeBody({ productRows }: { productRows: ProductBarRow[] }) {
  return (
    <div style={{ padding: "8px 16px 14px", flex: 1, minHeight: 0 }}>
      {productRows.map((p, i) => (
        <div
          key={`${p.label}-${i}`}
          style={{
            padding: "9px 0",
            borderBottom:
              i === productRows.length - 1 ? "none" : `1px solid ${T.hair}`,
          }}
        >
          <div
            style={{
              ...descriptionBodyStyle,
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
        </div>
      ))}
    </div>
  );
}

function DataCollectionBody({ dataRows }: { dataRows: DataMixRow[] }) {
  return (
    <div style={{ padding: "8px 16px 14px", flex: 1, minHeight: 0 }}>
      {dataRows.length === 0 ? (
        <div
          style={{
            padding: "8px 0 4px",
            fontSize: 13,
            color: T.faint,
            fontFamily: T.sans,
          }}
        >
          {EMPTY_DISPLAY}
        </div>
      ) : null}
      {dataRows.map((d, i) => (
        <div
          key={`${d.label}-${i}`}
          style={{
            padding: "9px 0",
            borderBottom:
              i === dataRows.length - 1 ? "none" : `1px solid ${T.hair}`,
          }}
        >
          <div style={{ ...descriptionBodyStyle, minWidth: 0 }}>{d.label}</div>
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
}: Props) {
  if (variant === "product_type") {
    return (
      <LinkPanel fillGridCell={fillGridCell}>
        <LinkedH>Product Type</LinkedH>
        <ProductTypeBody productRows={productRows} />
      </LinkPanel>
    );
  }

  if (variant === "data_collection") {
    return (
      <LinkPanel fillGridCell={fillGridCell}>
        <LinkedH>Data Collection Method</LinkedH>
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
          padding: "12px 14px 10px",
          flexShrink: 0,
          borderBottom: `1px solid ${T.hair}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: 18 }}>
          {tabBtn("product_type", "Product Type")}
          {tabBtn("data_collection", "Data Collection")}
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
