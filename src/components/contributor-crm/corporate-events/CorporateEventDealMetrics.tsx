"use client";

import React from "react";
import {
  formatCorporateEventEnterpriseValue,
  formatCorporateEventInvestmentAmount,
} from "@/lib/corporateEventAmountDisplay";
import { DEAL_TYPE_TONE, getFundingStageTone, tagColourStyle } from "@/lib/tagColors";

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
  event?: unknown;
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const mutedRowStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#4a5568",
  margin: "4px 0",
};

const pillStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 8px",
  fontSize: "12px",
  borderRadius: "999px",
  fontWeight: 600,
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
  evDisplay,
  event,
}) => {
  const resolvedAmountDisplay =
    (isNonEmptyString(amountDisplay) ? amountDisplay : null) ??
    (event ? formatCorporateEventInvestmentAmount(event, "") : "");

  const resolvedEvDisplay =
    (isNonEmptyString(evDisplay) ? evDisplay : null) ??
    (event ? formatCorporateEventEnterpriseValue(event, "") : "");

  const shouldShowAmountRow = isNonEmptyString(resolvedAmountDisplay);
  const shouldShowEvRow = isNonEmptyString(resolvedEvDisplay);

  return (
    <>
      <div style={mutedRowStyle}>
        <strong>Deal Type:</strong>{" "}
        {isNonEmptyString(dealType) || isNonEmptyString(fundingStage) ? (
          <>
            {isNonEmptyString(dealType) && (
              <span style={{ ...pillStyle, ...tagColourStyle(DEAL_TYPE_TONE) }}>{dealType}</span>
            )}
            {isNonEmptyString(fundingStage) && (
              <span
                style={{
                  ...pillStyle,
                  ...tagColourStyle(getFundingStageTone(fundingStage)),
                  marginLeft: 4,
                }}
              >
                {fundingStage}
              </span>
            )}
          </>
        ) : (
          <span>Not Available</span>
        )}
      </div>

      {!isPartnership && (
        <>
          {shouldShowAmountRow && (
            <div style={mutedRowStyle}>
              <strong>{amountLabel}:</strong> {resolvedAmountDisplay}
            </div>
          )}
          {shouldShowEvRow && (
            <div style={mutedRowStyle}>
              <strong>{evLabel}:</strong> {resolvedEvDisplay}
            </div>
          )}
        </>
      )}
    </>
  );
};
