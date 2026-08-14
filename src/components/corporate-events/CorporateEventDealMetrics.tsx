"use client";

import React from "react";
import { T } from "@/components/redesign/primitives";
import { fundingStageBadgeStyle } from "@/lib/corporateEventDealTypeBadge";
import {
  formatCorporateEventEnterpriseValue,
  formatCorporateEventInvestmentAmount,
  formatCorporateEventMillionsAmount,
} from "@/lib/corporateEventAmountDisplay";
import { DealTypeBadge } from "./DealTypeBadge";

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
  /** Optional funding stage label (e.g. "Series A") to display next to deal type. */
  fundingStage?: string | null;
  isPartnership?: boolean;
  amountLabel?: string;
  evLabel?: string;
  /**
   * Pre-formatted investment amount (e.g. "GBP11,560").
   * When omitted, `event` is used to derive the display string.
   */
  amountDisplay?: string | null;
  /** @deprecated Prefer `event` or `amountDisplay`. */
  amountMillions?: number | string | null;
  /** @deprecated Prefer `event` or `amountDisplay`. */
  amountCurrency?: string | null;
  /**
   * Pre-formatted EV amount. When omitted, `event` is used to derive the display string.
   */
  evDisplay?: string | null;
  /** @deprecated Prefer `event` or `evDisplay`. */
  evMillions?: number | string | null;
  /** @deprecated Prefer `event` or `evDisplay`. */
  evCurrency?: string | null;
  /** Optional textual fallback for EV when numeric amount is missing. */
  evBandFallback?: string | null;
  /** Event payload used to derive amount/EV when display props are not provided. */
  event?: unknown;
  align?: "left" | "center";
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

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
  event,
  align = "left",
}) => {
  const resolvedAmountDisplay =
    (isNonEmptyString(amountDisplay) ? amountDisplay : null) ??
    (event
      ? formatCorporateEventInvestmentAmount(event)
      : formatCorporateEventMillionsFallback(amountMillions, amountCurrency));

  const resolvedEvDisplay =
    (isNonEmptyString(evDisplay) ? evDisplay : null) ??
    (event
      ? formatCorporateEventEnterpriseValue(event, "")
      : formatCorporateEventMillionsFallback(evMillions, evCurrency));

  const hasEvBand = isNonEmptyString(evBandFallback);
  const shouldShowEvRow =
    isNonEmptyString(resolvedEvDisplay) || hasEvBand;

  const rowStyle = metricRowStyle(align);

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
              <span style={fundingStageBadgeStyle()}>{fundingStage}</span>
            )}
          </span>
        ) : (
          <span>Not Available</span>
        )}
      </div>

      {!isPartnership && (
        <>
          <div style={rowStyle}>
            <strong>{amountLabel}:</strong> {resolvedAmountDisplay}
          </div>
          {shouldShowEvRow && (
            <div style={rowStyle}>
              <strong>{evLabel}:</strong>{" "}
              {isNonEmptyString(resolvedEvDisplay)
                ? resolvedEvDisplay
                : hasEvBand
                  ? evBandFallback
                  : null}
            </div>
          )}
        </>
      )}
    </div>
  );
};

function formatCorporateEventMillionsFallback(
  amount: number | string | null | undefined,
  currency: string | null | undefined
): string {
  if (amount == null || !isNonEmptyString(currency)) return "Not available";
  return formatCorporateEventMillionsAmount(amount, currency);
}
