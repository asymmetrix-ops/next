"use client";
/**
 * ProductAttributesCard — Product Type, Revenue Model, and Data Collection Method
 * as three distinct stacked cards in the left column.
 */
import React from "react";
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
  const showProductType =
    productRows.length > 0 || typeof mcpStatus === "boolean";
  const showRevenueModel = revenueRows.length > 0;
  const showDataCollection = dataRows.length > 0;

  if (!showProductType && !showRevenueModel && !showDataCollection) return null;

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
      {showProductType && (
        <ProductDataToggleCard
          variant="product_type"
          productRows={productRows}
          dataRows={dataRows}
          mcpStatus={mcpStatus}
          fillGridCell={false}
        />
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
