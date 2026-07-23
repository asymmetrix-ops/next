"use client";
/**
 * ProductAttributesCard — Product Type, Revenue Model, and Data Collection Method
 * as three distinct stacked cards in the left column.
 */
import React from "react";
import { McpStatusCard } from "./McpStatusCard";
import { ProductDataToggleCard } from "./ProductDataToggleCard";
import { RevenueModelCard } from "./RevenueModelCard";
import type { ProductBarRow } from "./ProductDataToggleCard";
import type { RevenueModelRow } from "./RevenueModelCard";

type DataMixRow = { label: string };

type Props = {
  productRows: ProductBarRow[];
  revenueRows: RevenueModelRow[];
  dataRows: DataMixRow[];
  mcpStatus?: boolean | null;
};

export function ProductAttributesCard({
  productRows,
  revenueRows,
  dataRows,
  mcpStatus = null,
}: Props) {
  const showProductType = productRows.length > 0;
  const showMcp = typeof mcpStatus === "boolean";
  const showRevenueModel = revenueRows.length > 0;
  const showDataCollection = dataRows.length > 0;

  if (!showProductType && !showMcp && !showRevenueModel && !showDataCollection) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minWidth: 0,
        alignSelf: "flex-start",
        width: "100%",
      }}
    >
      {(showProductType || showMcp) && (
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "stretch",
            width: "100%",
          }}
        >
          {showProductType ? (
            <div style={{ flex: "1 1 200px", minWidth: 0 }}>
              <ProductDataToggleCard
                variant="product_type"
                productRows={productRows}
                dataRows={dataRows}
                fillGridCell={false}
              />
            </div>
          ) : null}
          {showMcp ? <McpStatusCard status={mcpStatus} /> : null}
        </div>
      )}
      {showRevenueModel && (
        <RevenueModelCard rows={revenueRows} fillGridCell={false} />
      )}
      {showDataCollection && (
        <ProductDataToggleCard
          variant="data_collection"
          productRows={productRows}
          dataRows={dataRows}
          fillGridCell={false}
        />
      )}
    </div>
  );
}
