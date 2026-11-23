"use client";
/**
 * One tabbed card (Product type | Revenue model) and a separate Data Collection
 * Method card. Tab UI is shared with the
 * Core Products / Users & Use Cases card.
 */
import React, { useEffect, useState } from "react";
import { ProductDataToggleCard } from "./ProductDataToggleCard";
import { TabHeader } from "./ProductUsersListCard";
import { LinkPanel, LinkedH, Pill, WeightChip, T, descriptionBodyStyle } from "./primitives";
import type { ProductBarRow } from "./ProductDataToggleCard";
import type { RevenueModelRow } from "./RevenueModelCard";

type DataMixRow = { label: string };
type AttrTab = "product_type" | "revenue_model";
type PillTone = NonNullable<React.ComponentProps<typeof Pill>["tone"]>;

type ProductDetailsProps = {
  productRows: ProductBarRow[];
  revenueRows: RevenueModelRow[];
  dataRows: DataMixRow[];
  /** Groups side by side instead of stacked */
  columns?: boolean;
};

// Product types follow the same colour order as the product mix bars
const PRODUCT_TYPE_TONES: PillTone[] = ["azure", "lavender", "coral", "warn", "emerald", "neutral"];

function revenueModelTone(weight?: string): PillTone {
  const key = (weight || "").trim().toLowerCase();
  if (key === "main" || key === "primary") return "azure";
  if (key === "secondary") return "lavender";
  return "neutral";
}

const groupLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: T.muted,
  marginBottom: 6,
};

// Product type, Revenue model and Data collection method as labelled tag groups
export function ProductDetailsPanel({ productRows, revenueRows, dataRows, columns = false }: ProductDetailsProps) {
  const groups: { label: string; items: React.ReactNode[] }[] = [];
  if (productRows.length > 0) {
    groups.push({
      label: "Product type",
      items: productRows.map((p, i) => (
        <Pill key={`${p.label}-${i}`} wrap tone={PRODUCT_TYPE_TONES[i % PRODUCT_TYPE_TONES.length]}>
          {p.label}
        </Pill>
      )),
    });
  }
  if (revenueRows.length > 0) {
    groups.push({
      label: "Revenue model",
      items: revenueRows.map((r, i) => (
        <Pill key={`${r.name}-${i}`} wrap tone={revenueModelTone(r.weight)}>
          {r.name}
        </Pill>
      )),
    });
  }
  if (dataRows.length > 0) {
    groups.push({
      label: "Data collection method",
      items: dataRows.map((d, i) => (
        <Pill key={`${d.label}-${i}`} wrap tone="ghost">
          {d.label}
        </Pill>
      )),
    });
  }
  if (groups.length === 0) return null;

  return (
    <div
      style={{
        display: columns ? "grid" : "flex",
        flexDirection: "column",
        gridTemplateColumns: columns ? "repeat(auto-fit, minmax(200px, 1fr))" : undefined,
        gap: columns ? 16 : 12,
        padding: "12px 16px 14px",
      }}
    >
      {groups.map((g) => (
        <div key={g.label} style={{ minWidth: 0 }}>
          <div style={groupLabelStyle}>{g.label}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{g.items}</div>
        </div>
      ))}
    </div>
  );
}

// Product details on their own, for companies without a Core Products list
export function ProductDetailsCard(props: Omit<ProductDetailsProps, "columns">) {
  return (
    <LinkPanel>
      <LinkedH>Product details</LinkedH>
      <ProductDetailsPanel {...props} columns />
    </LinkPanel>
  );
}

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
