"use client";
/**
 * One tabbed card (Product type | Revenue model) and a separate Data Collection
 * Method card. Tab UI is shared with the
 * Core Products / Users & Use Cases card.
 */
import React, { useEffect, useState } from "react";
import { ProductDataToggleCard } from "./ProductDataToggleCard";
import { TabHeader } from "./ProductUsersListCard";
import { LinkPanel, WeightChip, T, descriptionBodyStyle } from "./primitives";
import type { ProductBarRow } from "./ProductDataToggleCard";
import type { RevenueModelRow } from "./RevenueModelCard";

type DataMixRow = { label: string };
type AttrTab = "product_type" | "revenue_model";

type TypeRevenueProps = {
  productRows: ProductBarRow[];
  revenueRows: RevenueModelRow[];
  fillGridCell?: boolean;
};

/** Tabbed Product type | Revenue model card. Returns null when both are empty. */
export function ProductTypeRevenueCard({
  productRows,
  revenueRows,
  fillGridCell = false,
}: TypeRevenueProps) {
  const showProductType = productRows.length > 0;
  const showRevenueModel = revenueRows.length > 0;

  const tabs: { id: AttrTab; label: string }[] = [];
  if (showProductType) tabs.push({ id: "product_type", label: "Product type" });
  if (showRevenueModel) tabs.push({ id: "revenue_model", label: "Revenue model" });

  const [activeTab, setActiveTab] = useState<AttrTab>("product_type");
  const current: AttrTab | null = tabs.some((t) => t.id === activeTab)
    ? activeTab
    : tabs[0]?.id ?? null;

  useEffect(() => {
    if (current && current !== activeTab) setActiveTab(current);
  }, [current, activeTab]);

  if (!current) return null;

  return (
    <LinkPanel fillGridCell={fillGridCell}>
      <TabHeader tabs={tabs} activeTab={current} onTabChange={setActiveTab} />
      <div style={{ padding: "8px 16px 14px" }}>
        {current === "product_type"
              ? productRows.map((p, i) => (
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
                ))
              : revenueRows.map((row, i) => (
                  <div
                    key={row.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "9px 0",
                      borderBottom:
                        i < revenueRows.length - 1 ? `1px solid ${T.hair}` : "none",
                    }}
                  >
                    <div style={descriptionBodyStyle}>{row.name}</div>
                    <WeightChip weight={row.weight || ""} hideMinor />
                  </div>
                ))}
      </div>
    </LinkPanel>
  );
}

/** Data Collection Method card. Returns null when empty. */
export function DataCollectionCard({
  productRows,
  dataRows,
  fillGridCell = false,
}: {
  productRows: ProductBarRow[];
  dataRows: DataMixRow[];
  fillGridCell?: boolean;
}) {
  if (dataRows.length === 0) return null;
  return (
    <ProductDataToggleCard
      variant="data_collection"
      productRows={productRows}
      dataRows={dataRows}
      fillGridCell={fillGridCell}
    />
  );
}
