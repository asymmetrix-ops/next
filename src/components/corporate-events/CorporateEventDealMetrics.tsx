"use client";

import React from "react";
import { T } from "@/components/redesign/primitives";
import { fundingStageBadgeStyle } from "@/lib/corporateEventDealTypeBadge";
import { DealTypeBadge } from "./DealTypeBadge";
import { formatPlatformDealMillions } from "@/lib/formatPlatformCurrency";
import type { Currency } from "@/lib/fxRates";
import { isNonEmptyDisplayString } from "@/lib/emptyDisplay";
import { DEFAULT_PLATFORM_CURRENCY } from "@/lib/platformCurrency";

const metricRowStyle = (
  align: "left" | "center"
): React.CSSProperties => ({
  fontSize: 12,
  color: T.muted,
  margin: "4px 0",
  lineHeight: 1.45,
  textAlign: align,
  width: "100%",
});

export interface CorporateEventDealMetricsProps {
  dealType?: string | null;
  fundingStage?: string | null;
  isPartnership?: boolean;
  amountLabel?: string;
  evLabel?: string;
  amountDisplay?: string | null;
  amountMillions?: number | string | null;
  amountCurrency?: string | null;
  evDisplay?: string | null;
  evMillions?: number | string | null;
  evCurrency?: string | null;
  evBandFallback?: string | null;
  align?: "left" | "center";
}

const isNonEmptyString = (value: unknown): value is string =>
  isNonEmptyDisplayString(value);

const hasNumericAmount = (
  amount: number | string | null | undefined
): boolean => {
  if (amount == null) return false;
  const n =
    typeof amount === "number"
      ? amount
      : Number(String(amount).replace(/,/g, "").trim());
  return Number.isFinite(n);
};

const formatDealAmount = (
  amount: number | string | null | undefined,
  currency: string | null | undefined
): string => {
  if (!hasNumericAmount(amount)) return "Not available";
  return formatPlatformDealMillions(
    amount,
    (currency?.trim() || DEFAULT_PLATFORM_CURRENCY) as Currency
  );
};

export const CorporateEventDealMetrics: React.FC<
  CorporateEventDealMetricsProps
> = ({
  dealType,
  fundingStage,
  isPartnership,
  amountLabel = "Amount (m)",
  evLabel = "EV (m)",
  amountDisplay,
  amountMillions,
  amountCurrency,
  evDisplay,
  evMillions,
  evCurrency,
  evBandFallback,
  align = "left",
}) => {
  const hasAmountNumeric = hasNumericAmount(amountMillions);
  const hasAmountDisplay = isNonEmptyString(amountDisplay);
  const shouldShowAmountRow = hasAmountNumeric || hasAmountDisplay;

  const hasEvNumeric = hasNumericAmount(evMillions);
  const hasEvDisplay = isNonEmptyString(evDisplay);
  const hasEvBand = isNonEmptyString(evBandFallback);
  const shouldShowEvRow = hasEvNumeric || hasEvDisplay || hasEvBand;
  const rowStyle = metricRowStyle(align);
  const hasDealType = isNonEmptyString(dealType) || isNonEmptyString(fundingStage);
  if (!hasDealType && (isPartnership || (!shouldShowAmountRow && !shouldShowEvRow))) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
        width: "100%",
        minWidth: 0,
      }}
    >
      {hasDealType && (
      <div style={rowStyle}>
        <strong>Deal Type:</strong>{" "}
        {isNonEmptyString(dealType) || isNonEmptyString(fundingStage) ? (
          <span
            style={{
              display: "inline-flex",
              flexWrap: "wrap",
              gap: 4,
              justifyContent: align === "center" ? "center" : "flex-start",
              verticalAlign: "middle",
            }}
          >
            {isNonEmptyString(dealType) && <DealTypeBadge dealType={dealType} />}
            {isNonEmptyString(fundingStage) && (
              <span style={fundingStageBadgeStyle(fundingStage)}>{fundingStage}</span>
            )}
          </span>
        ) : null}
      </div>
      )}

      {!isPartnership && (
        <>
          {shouldShowAmountRow && (
            <div style={rowStyle}>
              <strong>{amountLabel}:</strong>{" "}
              {hasAmountNumeric
                ? formatDealAmount(amountMillions, amountCurrency)
                : amountDisplay}
            </div>
          )}
          {shouldShowEvRow && (
            <div style={rowStyle}>
              <strong>{evLabel}:</strong>{" "}
              {hasEvNumeric
                ? formatDealAmount(evMillions, evCurrency)
                : isNonEmptyString(evDisplay)
                  ? evDisplay
                  : isNonEmptyString(evBandFallback)
                    ? evBandFallback
                    : null}
            </div>
          )}
        </>
      )}
    </div>
  );
};
